import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchTc, getSentenciaTc, searchByTema } from './client.js';

const tools: Tool[] = [
  {
    name: 'search_sentencias_tc',
    description: 'Search Constitutional Court (Tribunal Constitucional) decisions by text, number, year, type (STC/ATC/DTC), or subject matter.',
    inputSchema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Free text search' },
        numero: { type: 'string', description: 'Decision number' },
        anyo: { type: 'string', description: 'Year' },
        tipo: { type: 'string', description: 'Type: STC, ATC, or DTC' },
        materia: { type: 'string', description: 'Subject matter' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
    },
  },
  {
    name: 'get_sentencia_tc',
    description: 'Retrieve a specific Constitutional Court decision by number and year.',
    inputSchema: {
      type: 'object',
      properties: {
        numero: { type: 'string', description: 'Decision number' },
        anyo: { type: 'string', description: 'Year' },
      },
      required: ['numero', 'anyo'],
    },
  },
  {
    name: 'search_by_tema',
    description: 'Search TC decisions by subject matter/theme.',
    inputSchema: {
      type: 'object',
      properties: {
        tema: { type: 'string', description: 'Subject/theme to search' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['tema'],
    },
  },
];

export function createTcServer(): Server {
  const server = new Server(
    { name: 'tribunal-constitucional', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_sentencias_tc': {
          const result = await searchTc(args as Record<string, unknown>);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'get_sentencia_tc': {
          const { numero, anyo } = args as { numero: string; anyo: string };
          const result = await getSentenciaTc(numero, anyo);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'search_by_tema': {
          const { tema, limit } = args as { tema: string; limit?: number };
          const result = await searchByTema(tema, limit);
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

export async function runTcStdioServer(): Promise<void> {
  const server = createTcServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Tribunal Constitucional MCP server running on stdio');
}
