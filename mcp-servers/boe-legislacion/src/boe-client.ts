import { resilientFetch, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';

const BOE_BASE_URL = 'https://www.boe.es/datosabiertos/api/legislacion-consolidada';

export interface BoeSearchParams {
  query_text?: string;
  titulo?: string;
  rango?: string;
  departamento?: string;
  materia?: string;
  numero_oficial?: string;
  fecha_publicacion_desde?: string; // YYYYMMDD
  fecha_publicacion_hasta?: string; // YYYYMMDD
  fecha_disposicion_desde?: string; // YYYYMMDD
  fecha_disposicion_hasta?: string; // YYYYMMDD
  limit?: number;
  offset?: number;
}

export interface BoeNormSummary {
  identificador: string;
  titulo: string;
  rango?: { codigo: string; texto: string };
  departamento?: { codigo: string; texto: string };
  fecha_publicacion?: string;
  fecha_disposicion?: string;
  numero_oficial?: string;
  estado_consolidacion?: { codigo: string; texto: string };
  vigencia_agotada?: string;
  url_eli?: string;
  url_html_consolidada?: string;
  fecha_actualizacion?: string;
}

export interface BoeSearchResult {
  status: { code: string; text: string };
  data: BoeNormSummary[];
}

function buildSearchQuery(params: BoeSearchParams): string {
  const conditions: string[] = [];

  if (params.query_text) {
    conditions.push(`texto:${params.query_text}`);
  }
  if (params.titulo) {
    conditions.push(`titulo:${params.titulo}`);
  }
  if (params.rango) {
    conditions.push(`rango@codigo:${params.rango}`);
  }
  if (params.departamento) {
    conditions.push(`departamento@codigo:${params.departamento}`);
  }
  if (params.materia) {
    conditions.push(`materia@codigo:${params.materia}`);
  }
  if (params.numero_oficial) {
    conditions.push(`numero_oficial:${params.numero_oficial}`);
  }

  const queryString = conditions.length > 0 ? conditions.join(' AND ') : '*';

  const queryBody: {
    query: {
      query_string: { query: string };
      range?: Record<string, { gte?: string; lte?: string }>;
    };
    sort: Array<Record<string, string>>;
  } = {
    query: {
      query_string: { query: queryString },
    },
    sort: [{ fecha_publicacion: 'desc' }],
  };

  if (params.fecha_publicacion_desde || params.fecha_publicacion_hasta) {
    queryBody.query.range = {
      ...queryBody.query.range,
      fecha_publicacion: {
        gte: params.fecha_publicacion_desde ?? '',
        lte: params.fecha_publicacion_hasta ?? '',
      },
    };
  }
  if (params.fecha_disposicion_desde || params.fecha_disposicion_hasta) {
    queryBody.query.range = {
      ...queryBody.query.range,
      fecha_disposicion: {
        gte: params.fecha_disposicion_desde ?? '',
        lte: params.fecha_disposicion_hasta ?? '',
      },
    };
  }

  return JSON.stringify(queryBody);
}

export async function searchBoe(params: BoeSearchParams): Promise<BoeSearchResult> {
  const url = new URL(BOE_BASE_URL);

  if (params.limit !== undefined) {
    url.searchParams.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.set('offset', String(params.offset));
  }

  const queryJson = buildSearchQuery(params);
  url.searchParams.set('query', queryJson);

  const response = await resilientFetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new McpError(ErrorCodes.ServiceUnavailable, `BOE API returned ${response.status}`);
  }

  return (await response.json()) as BoeSearchResult;
}

export async function getLegislacion(id: string): Promise<unknown> {
  const url = `${BOE_BASE_URL}/id/${encodeURIComponent(id)}`;
  const response = await resilientFetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw new McpError(ErrorCodes.ResourceNotFound, `Norm ${id} not found`);
  }
  if (!response.ok) {
    throw new McpError(ErrorCodes.ServiceUnavailable, `BOE API returned ${response.status}`);
  }

  return response.json();
}

export async function getMetadatos(id: string): Promise<unknown> {
  const url = `${BOE_BASE_URL}/id/${encodeURIComponent(id)}/metadatos`;
  const response = await resilientFetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw new McpError(ErrorCodes.ResourceNotFound, `Norm ${id} not found`);
  }
  if (!response.ok) {
    throw new McpError(ErrorCodes.ServiceUnavailable, `BOE API returned ${response.status}`);
  }

  return response.json();
}

export async function getTextoConsolidado(id: string): Promise<unknown> {
  const url = `${BOE_BASE_URL}/id/${encodeURIComponent(id)}/texto`;
  const response = await resilientFetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw new McpError(ErrorCodes.ResourceNotFound, `Norm ${id} not found`);
  }
  if (!response.ok) {
    throw new McpError(ErrorCodes.ServiceUnavailable, `BOE API returned ${response.status}`);
  }

  return response.json();
}

export async function getIndice(id: string): Promise<unknown> {
  const url = `${BOE_BASE_URL}/id/${encodeURIComponent(id)}/texto/indice`;
  const response = await resilientFetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw new McpError(ErrorCodes.ResourceNotFound, `Norm ${id} not found`);
  }
  if (!response.ok) {
    throw new McpError(ErrorCodes.ServiceUnavailable, `BOE API returned ${response.status}`);
  }

  return response.json();
}

export async function getBloque(id: string, idBloque: string): Promise<unknown> {
  const url = `${BOE_BASE_URL}/id/${encodeURIComponent(id)}/texto/bloque/${encodeURIComponent(idBloque)}`;
  const response = await resilientFetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw new McpError(ErrorCodes.ResourceNotFound, `Block ${idBloque} in norm ${id} not found`);
  }
  if (!response.ok) {
    throw new McpError(ErrorCodes.ServiceUnavailable, `BOE API returned ${response.status}`);
  }

  return response.json();
}

export async function getAnalisis(id: string): Promise<unknown> {
  const url = `${BOE_BASE_URL}/id/${encodeURIComponent(id)}/analisis`;
  const response = await resilientFetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw new McpError(ErrorCodes.ResourceNotFound, `Norm ${id} not found`);
  }
  if (!response.ok) {
    throw new McpError(ErrorCodes.ServiceUnavailable, `BOE API returned ${response.status}`);
  }

  return response.json();
}
