import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchDoctrina, searchByAutor } from './client.js';

const tools: Tool[] = [
  {
    name: 'search_doctrina',
    description: 'Search academic legal doctrine from INDRET (UPF), Dialnet, and IURIS Digital.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        source: { type: 'string', description: 'Source: indret, dialnet, iuris (omit for all)' },
        limit: { type: 'number', default: 10 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_by_autor',
    description: 'Search doctrine by author name.',
    inputSchema: {
      type: 'object',
      properties: {
        autor: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
      required: ['autor'],
    },
  },
];

export function createDoctrinaServer(): Server {
  const server = new Server({ name: 'doctrina-academica', version: '1.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case 'search_doctrina':
          return { content: [{ type: 'text', text: JSON.stringify(await searchDoctrina(String(args?.query), args?.source as string | undefined, Number(args?.limit)), null, 2) }] };
        case 'search_by_autor':
          return { content: [{ type: 'text', text: JSON.stringify(await searchByAutor(String(args?.autor), Number(args?.limit)), null, 2) }] };
        default:
          throw new McpError(ErrorCodes.InvalidRequest, `Unknown tool: ${name}`);
      }
    } catch (err) { logger.error({ err, tool: name }, 'Tool failed'); throw err; }
  });
  return server;
}

export async function runDoctrinaStdioServer(): Promise<void> {
  const server = createDoctrinaServer();
  await server.connect(new StdioServerTransport());
  logger.info('Doctrina Academica MCP server running on stdio');
}
