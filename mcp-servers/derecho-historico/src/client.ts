const GAZETA_URL = 'https://www.boe.es/datosabiertos';
const CEPC_HISTORICO = 'https://www.cepc.gob.es';

export async function searchGazetaHistorica(query: string, _limit = 10): Promise<unknown> {
  const url = `${GAZETA_URL}?texto=${encodeURIComponent(query)}`;
  return {
    source: 'gazeta-historica',
    query,
    url,
    nota: 'La Gazeta Histórica (1661-1959) está disponible en el portal de datos abiertos del BOE/CEPC.',
    results: [],
  };
}

export async function searchLegislacionHistorica(query: string, _limit = 10): Promise<unknown> {
  const url = `${CEPC_HISTORICO}/buscar?texto=${encodeURIComponent(query)}`;
  return {
    source: 'legislacion-historica-cepc',
    query,
    url,
    nota: 'La Legislación Histórica de España (desde el siglo X hasta Isabel II) está disponible en el CEPC.',
    results: [],
  };
}

export async function getTextoHistorico(id: string): Promise<unknown> {
  return {
    id,
    nota: 'Los textos históricos están disponibles en formato PDF en el portal del CEPC o BOE.',
    url: `https://www.boe.es/buscar/act.php?id=${encodeURIComponent(id)}`,
  };
}
