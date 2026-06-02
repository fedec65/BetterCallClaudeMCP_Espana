const PORTICO_URL = 'https://www.porticolegal.com';
const FINDIUR_URL = 'https://www.findiur.com';

export async function searchPortico(query: string, _limit = 10): Promise<unknown> {
  const url = `${PORTICO_URL}/buscar?q=${encodeURIComponent(query)}`;
  return { source: 'portico-legal', query, url, nota: 'Portal generalista de legislación, jurisprudencia y literatura jurídica.', results: [] };
}

export async function searchFindiur(query: string, _limit = 10): Promise<unknown> {
  const url = `${FINDIUR_URL}/buscar?q=${encodeURIComponent(query)}`;
  return { source: 'findiur', query, url, nota: 'Búsqueda con IA de normas y jurisprudencia.', results: [] };
}

export async function searchMultiSource(query: string, limit = 10): Promise<unknown> {
  const [portico, findiur] = await Promise.all([
    searchPortico(query, limit),
    searchFindiur(query, limit),
  ]);
  return { source: 'busqueda-general', query, results: [portico, findiur] };
}
