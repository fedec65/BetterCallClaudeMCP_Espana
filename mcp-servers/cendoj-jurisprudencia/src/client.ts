import { resilientFetch, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';

const CENDOJ_BASE = 'https://www.poderjudicial.es/search/indexAN.jsp';

export interface CendojSearchParams {
  texto?: string;
  tribunal?: string;
  fecha_desde?: string; // DD/MM/YYYY
  fecha_hasta?: string; // DD/MM/YYYY
  ecli?: string;
  numero_roj?: string;
  materia?: string;
  limit?: number;
}

export async function searchCendoj(params: CendojSearchParams): Promise<unknown> {
  const url = new URL(CENDOJ_BASE);

  if (params.texto) url.searchParams.set('texto', params.texto);
  if (params.tribunal) url.searchParams.set('organismo', params.tribunal);
  if (params.fecha_desde) url.searchParams.set('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) url.searchParams.set('fecha_hasta', params.fecha_hasta);
  if (params.ecli) url.searchParams.set('ecli', params.ecli);
  if (params.numero_roj) url.searchParams.set('numero_roj', params.numero_roj);
  if (params.materia) url.searchParams.set('materia', params.materia);

  const response = await resilientFetch(url.toString());
  const html = await response.text();

  // Extract results from CENDOJ HTML
  const results: Array<{
    titulo: string;
    ecli?: string;
    roj?: string;
    tribunal?: string;
    fecha?: string;
    url?: string;
  }> = [];

  // Look for result blocks
  const resultBlocks = html.match(/<tr[^>]*class="[^"]*resultado[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const block of resultBlocks.slice(0, params.limit ?? 10)) {
    const ecliMatch = block.match(/ECLI:ES:[^<\s]+/);
    const rojMatch = block.match(/ROJ:\s*([^<\s]+)/);
    const tribunalMatch = block.match(/Tribunal[^<]+/i);
    const fechaMatch = block.match(/(\d{2}\/\d{2}\/\d{4})/);

    results.push({
      titulo: block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200),
      ecli: ecliMatch ? ecliMatch[0] : undefined,
      roj: rojMatch ? rojMatch[1] : undefined,
      tribunal: tribunalMatch ? tribunalMatch[0].trim() : undefined,
      fecha: fechaMatch ? fechaMatch[1] : undefined,
      url: ecliMatch ? `https://www.poderjudicial.es/search/indexAN.jsp?ecli=${encodeURIComponent(ecliMatch[0])}` : undefined,
    });
  }

  // If no structured results found, do a basic extraction
  if (results.length === 0) {
    const ecliMatches = html.match(/ECLI:ES:[A-Z]+:\d{4}:\d+[A-Z]?/g) || [];
    const uniqueEcli = [...new Set(ecliMatches)].slice(0, params.limit ?? 10);
    for (const ecli of uniqueEcli) {
      results.push({
        titulo: `Sentencia ${ecli}`,
        ecli,
        url: `https://www.poderjudicial.es/search/indexAN.jsp?ecli=${encodeURIComponent(ecli)}`,
      });
    }
  }

  return { source: 'cendoj', total: results.length, results };
}

export async function getSentenciaByEcli(ecli: string): Promise<unknown> {
  if (!ecli.match(/^ECLI:ES:[A-Z]+:\d{4}:\d+[A-Z]?$/i)) {
    throw new McpError(ErrorCodes.InvalidRequest, `Invalid ECLI format: ${ecli}`);
  }

  const url = `${CENDOJ_BASE}?ecli=${encodeURIComponent(ecli.toUpperCase())}`;
  const response = await resilientFetch(url);
  const html = await response.text();

  return {
    ecli: ecli.toUpperCase(),
    url,
    preview: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000),
  };
}

export async function searchByTribunal(tribunal: string, fechaDesde?: string, fechaHasta?: string, limit = 10): Promise<unknown> {
  return searchCendoj({
    tribunal,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    limit,
  });
}
