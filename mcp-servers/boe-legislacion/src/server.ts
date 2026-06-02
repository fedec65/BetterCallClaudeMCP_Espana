import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import {
  searchBoe,
  getLegislacion,
  getMetadatos,
  getTextoConsolidado,
  getIndice,
  getBloque,
  getAnalisis,
} from './boe-client.js';

const tools: Tool[] = [
  {
    name: 'search_boe',
    description: 'Search Spanish consolidated legislation from the BOE (Boletín Oficial del Estado). Supports full-text search, filtering by title, norm type (rango), department, subject matter (materia), official number, and date ranges.',
    inputSchema: {
      type: 'object',
      properties: {
        query_text: { type: 'string', description: 'Full-text search across the norm text' },
        titulo: { type: 'string', description: 'Search in the norm title' },
        rango: { type: 'string', description: 'Norm type code (e.g., 1300 for Ley, 1400 for Real Decreto)' },
        departamento: { type: 'string', description: 'Department code that issued the norm' },
        materia: { type: 'string', description: 'Subject matter code from the controlled vocabulary' },
        numero_oficial: { type: 'string', description: 'Official number (e.g., 40/2015)' },
        fecha_publicacion_desde: { type: 'string', description: 'Publication date from (YYYYMMDD)' },
        fecha_publicacion_hasta: { type: 'string', description: 'Publication date to (YYYYMMDD)' },
        fecha_disposicion_desde: { type: 'string', description: 'Disposition date from (YYYYMMDD)' },
        fecha_disposicion_hasta: { type: 'string', description: 'Disposition date to (YYYYMMDD)' },
        limit: { type: 'number', description: 'Max results (-1 for all, default 50)', default: 50 },
        offset: { type: 'number', description: 'Skip N results', default: 0 },
      },
    },
  },
  {
    name: 'get_legislacion',
    description: 'Retrieve the full consolidated norm from BOE by its identifier (e.g., BOE-A-2015-10566). Returns metadata, analysis, ELI metadata, and consolidated text.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'BOE identifier of the norm (e.g., BOE-A-2015-10566)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_metadatos',
    description: 'Retrieve only the metadata of a consolidated BOE norm by its identifier.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'BOE identifier (e.g., BOE-A-2015-10566)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_texto_consolidado',
    description: 'Retrieve the consolidated text of a BOE norm by its identifier. Returns the full text structured in HTML blocks (articles, preambles, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'BOE identifier (e.g., BOE-A-2015-10566)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_indice',
    description: 'Retrieve the index (list of blocks/articles) of a consolidated BOE norm. Useful for navigating to specific articles or sections.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'BOE identifier (e.g., BOE-A-2015-10566)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_bloque',
    description: 'Retrieve a specific block (article, preamble, etc.) from a consolidated BOE norm by its block ID. Use get_indice first to discover block IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'BOE identifier (e.g., BOE-A-2015-10566)' },
        id_bloque: { type: 'string', description: 'Block identifier (e.g., a1, a2, pr, dd, df)' },
      },
      required: ['id', 'id_bloque'],
    },
  },
  {
    name: 'get_analisis',
    description: 'Retrieve the legal analysis of a BOE norm, including subject matters (materias), notes (notas), and references to other norms (anteriores/posteriores).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'BOE identifier (e.g., BOE-A-2015-10566)' },
      },
      required: ['id'],
    },
  },
];

export function createBoeServer(): Server {
  const server = new Server(
    { name: 'boe-legislacion', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_boe': {
          const result = await searchBoe(args as Record<string, unknown>);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'get_legislacion': {
          const { id } = args as { id: string };
          const result = await getLegislacion(id);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'get_metadatos': {
          const { id } = args as { id: string };
          const result = await getMetadatos(id);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'get_texto_consolidado': {
          const { id } = args as { id: string };
          const result = await getTextoConsolidado(id);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'get_indice': {
          const { id } = args as { id: string };
          const result = await getIndice(id);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'get_bloque': {
          const { id, id_bloque } = args as { id: string; id_bloque: string };
          const result = await getBloque(id, id_bloque);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'get_analisis': {
          const { id } = args as { id: string };
          const result = await getAnalisis(id);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        default:
          throw new McpError(ErrorCodes.InvalidRequest, `Unknown tool: ${name}`);
      }
    } catch (err) {
      logger.error({ err, tool: name }, 'Tool execution failed');
      throw err;
    }
  });

  return server;
}

export async function runBoeStdioServer(): Promise<void> {
  const server = createBoeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('BOE Legislación MCP server running on stdio');
}
