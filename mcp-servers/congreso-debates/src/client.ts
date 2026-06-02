import { resilientFetch } from '@bettercallclaude/esp-shared';

const CONGRESO_BASE = 'https://www.congreso.es';

export interface CongresoSearchParams {
  texto?: string;
  legislatura?: string;
  tipo?: string; // proposicion_ley, proyecto_ley, proposicion_no_ley, etc.
  numero?: string;
  anyo?: string;
  limit?: number;
}

export async function searchProyectosLey(params: CongresoSearchParams): Promise<unknown> {
  const url = new URL(`${CONGRESO_BASE}/es/busqueda-de-iniciativas`);

  if (params.texto) url.searchParams.set('texto', params.texto);
  if (params.legislatura) url.searchParams.set('legislatura', params.legislatura);
  if (params.tipo) url.searchParams.set('tipo', params.tipo);

  const response = await resilientFetch(url.toString());
  const html = await response.text();

  const results: Array<{
    titulo: string;
    tipo?: string;
    numero?: string;
    legislatura?: string;
    fecha?: string;
    url?: string;
  }> = [];

  // Basic extraction of initiative references
  const initiativeMatches = html.match(/(Proyecto|Proposici[oó]n)\s+de\s+Ley[^<\n]+/gi) || [];
  const seen = new Set<string>();

  for (const match of initiativeMatches.slice(0, params.limit ?? 10)) {
    const clean = match.trim();
    if (!seen.has(clean)) {
      seen.add(clean);
      results.push({
        titulo: clean,
        url: CONGRESO_BASE,
      });
    }
  }

  return { source: 'congreso', tipo: 'iniciativas', total: results.length, results };
}

export async function searchDebates(texto: string, legislatura?: string, limit = 10): Promise<unknown> {
  const url = new URL(`${CONGRESO_BASE}/es/busqueda-de-intervenciones`);
  url.searchParams.set('texto', texto);
  if (legislatura) url.searchParams.set('legislatura', legislatura);

  const response = await resilientFetch(url.toString());
  const html = await response.text();

  const results: Array<{
    titulo: string;
    orador?: string;
    fecha?: string;
    url?: string;
  }> = [];

  // Extract intervention references
  const matches = html.match(/[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[^<\n]{0,100}/gi) || [];
  const seen = new Set<string>();

  for (const match of matches.slice(0, limit)) {
    const clean = match.trim();
    if (!seen.has(clean) && clean.length > 10) {
      seen.add(clean);
      results.push({
        titulo: clean,
        url: CONGRESO_BASE,
      });
    }
  }

  return { source: 'congreso', tipo: 'debates', total: results.length, results };
}

export async function trackLegislativeStatus(numero: string, anyo: string): Promise<unknown> {
  const url = `${CONGRESO_BASE}/es/busqueda-de-iniciativas?numero=${encodeURIComponent(numero)}&anyo=${encodeURIComponent(anyo)}`;
  const response = await resilientFetch(url);
  const html = await response.text();

  return {
    numero,
    anyo,
    url,
    preview: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 800),
  };
}
