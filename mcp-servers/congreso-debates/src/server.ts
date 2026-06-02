import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchProyectosLey, searchDebates, trackLegislativeStatus } from './client.js';

const tools: Tool[] = [
  {
    name: 'search_proyectos_ley',
    description: 'Search bills and legislative initiatives (proyectos/proposiciones de ley) from the Spanish Congress (Congreso de los Diputados).',
    inputSchema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Search text' },
        legislatura: { type: 'string', description: 'Legislature number (e.g., XV)' },
        tipo: { type: 'string', description: 'Type: proyecto_ley, proposicion_ley, proposicion_no_ley' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
    },
  },
  {
    name: 'search_debates',
    description: 'Search parliamentary debates and interventions from the Spanish Congress.',
    inputSchema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Search text' },
        legislatura: { type: 'string', description: 'Legislature number' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['texto'],
    },
  },
  {
    name: 'track_legislative_status',
    description: 'Track the legislative status of a specific bill by number and year.',
    inputSchema: {
      type: 'object',
      properties: {
        numero: { type: 'string', description: 'Bill number' },
        anyo: { type: 'string', description: 'Year' },
      },
      required: ['numero', 'anyo'],
    },
  },
];

export function createCongresoServer(): Server {
  const server = new Server(
    { name: 'congreso-debates', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_proyectos_ley': {
          const result = await searchProyectosLey(args as Record<string, unknown>);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'search_debates': {
          const { texto, legislatura, limit } = args as { texto: string; legislatura?: string; limit?: number };
          const result = await searchDebates(texto, legislatura, limit);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'track_legislative_status': {
          const { numero, anyo } = args as { numero: string; anyo: string };
          const result = await trackLegislativeStatus(numero, anyo);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
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

export async function runCongresoStdioServer(): Promise<void> {
  const server = createCongresoServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Congreso Debates MCP server running on stdio');
}
