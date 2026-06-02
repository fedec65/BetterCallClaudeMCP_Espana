import { resilientFetch } from '@bettercallclaude/esp-shared';

const TC_BASE = 'http://hj.tribunalconstitucional.es/es/Busqueda/Index';
const TC_API = 'http://hj.tribunalconstitucional.es/es/Busqueda/Buscar';

export interface TcSearchParams {
  texto?: string;
  numero?: string;
  anyo?: string;
  tipo?: string; // STC, ATC, DTC
  materia?: string;
  limit?: number;
}

export async function searchTc(params: TcSearchParams): Promise<unknown> {
  const url = new URL(TC_API);

  if (params.texto) url.searchParams.set('Texto', params.texto);
  if (params.numero) url.searchParams.set('Numero', params.numero);
  if (params.anyo) url.searchParams.set('Anyo', params.anyo);
  if (params.tipo) url.searchParams.set('Tipo', params.tipo.toUpperCase());
  if (params.materia) url.searchParams.set('Materia', params.materia);

  const response = await resilientFetch(url.toString());
  const html = await response.text();

  const results: Array<{
    titulo: string;
    numero?: string;
    tipo?: string;
    fecha?: string;
    ecli?: string;
    url?: string;
  }> = [];

  // Extract STC/ATC references
  const stcMatches = html.match(/(STC|ATC|DTC)\s+(\d+)\/(\d{4})/gi) || [];
  const seen = new Set<string>();

  for (const match of stcMatches.slice(0, params.limit ?? 10)) {
    if (!seen.has(match)) {
      seen.add(match);
      const [tipo, resto] = match.split(' ');
      const [numero, anyo] = resto.split('/');
      const ecli = `ECLI:ES:TC:${anyo}:${numero}${tipo === 'ATC' ? 'A' : tipo === 'DTC' ? 'D' : ''}`;
      results.push({
        titulo: `${match}`,
        numero: `${tipo} ${numero}/${anyo}`,
        tipo: tipo?.toUpperCase(),
        fecha: anyo,
        ecli,
        url: `https://www.boe.es/diario_boe/txt.php?id=${ecli}`,
      });
    }
  }

  return { source: 'tribunal-constitucional', total: results.length, results };
}

export async function getSentenciaTc(numero: string, anyo: string): Promise<unknown> {
  const url = `${TC_BASE}?Numero=${encodeURIComponent(numero)}&Anyo=${encodeURIComponent(anyo)}`;
  const response = await resilientFetch(url);
  const html = await response.text();

  return {
    numero: `STC ${numero}/${anyo}`,
    url,
    preview: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000),
  };
}

export async function searchByTema(tema: string, limit = 10): Promise<unknown> {
  return searchTc({ texto: tema, limit });
}
