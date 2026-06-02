const NORMACIVIL_URL = 'https://normacivil.udg.edu';

export async function searchNormaCivilCat(query: string, _limit = 10): Promise<unknown> {
  const url = `${NORMACIVIL_URL}/?s=${encodeURIComponent(query)}`;
  return {
    source: 'projecte-norma-civil',
    query,
    url,
    nota: 'Projecte Norma Civil (Universitat de Girona) - Dret civil català i estatuts espanyols.',
    results: [],
  };
}

export async function compareCatalanSpanishCivil(articulo: string): Promise<unknown> {
  return {
    articulo,
    nota: 'Comparativa entre el Dret civil català i el Codi civil espanyol disponible a normacivil.udg.edu',
    url: `${NORMACIVIL_URL}/?s=${encodeURIComponent(articulo)}`,
  };
}

export async function getArticuloCivilCat(id: string): Promise<unknown> {
  return {
    id,
    nota: 'Artículo del Dret civil català.',
    url: `${NORMACIVIL_URL}/?p=${encodeURIComponent(id)}`,
  };
}
