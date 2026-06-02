const INDRET_URL = 'https://www.indret.com';
const DIALNET_URL = 'https://dialnet.unirioja.es';
const IURIS_URL = 'https://iurisdigital.org';

export async function searchDoctrina(query: string, source?: string, limit = 10): Promise<unknown> {
  const results: Array<{ titulo: string; autor?: string; fuente: string; url: string; año?: string }> = [];

  if (!source || source === 'indret') {
    const url = `${INDRET_URL}/buscar?query=${encodeURIComponent(query)}`;
    results.push({ titulo: `INDRET search: ${query}`, fuente: 'INDRET', url });
  }
  if (!source || source === 'dialnet') {
    const url = `${DIALNET_URL}/buscar/documentos?palabras=${encodeURIComponent(query)}`;
    results.push({ titulo: `Dialnet search: ${query}`, fuente: 'Dialnet', url });
  }
  if (!source || source === 'iuris') {
    const url = `${IURIS_URL}/?s=${encodeURIComponent(query)}`;
    results.push({ titulo: `IURIS Digital search: ${query}`, fuente: 'IURIS Digital', url });
  }

  return { source: 'doctrina-academica', query, total: results.length, results: results.slice(0, limit) };
}

export async function searchByAutor(autor: string, limit = 10): Promise<unknown> {
  return searchDoctrina(autor, undefined, limit);
}
