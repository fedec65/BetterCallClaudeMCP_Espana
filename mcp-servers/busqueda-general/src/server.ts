import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchPortico, searchFindiur, searchMultiSource } from './client.js';

const tools: Tool[] = [
  { name: 'search_portico', description: 'Search Portico Legal generalist legal portal.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 10 } }, required: ['query'] } },
  { name: 'search_findiur', description: 'Search Findiur AI-powered legal search.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 10 } }, required: ['query'] } },
  { name: 'search_multi_source', description: 'Search across Portico Legal and Findiur simultaneously.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 10 } }, required: ['query'] } },
];

export function createBusquedaServer(): Server {
  const server = new Server({ name: 'busqueda-general', version: '1.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case 'search_portico': return { content: [{ type: 'text', text: JSON.stringify(await searchPortico(String(args?.query), Number(args?.limit)), null, 2) }] };
        case 'search_findiur': return { content: [{ type: 'text', text: JSON.stringify(await searchFindiur(String(args?.query), Number(args?.limit)), null, 2) }] };
        case 'search_multi_source': return { content: [{ type: 'text', text: JSON.stringify(await searchMultiSource(String(args?.query), Number(args?.limit)), null, 2) }] };
        default: throw new McpError(ErrorCodes.InvalidRequest, `Unknown tool: ${name}`);
      }
    } catch (err) { logger.error({ err, tool: name }, 'Tool failed'); throw err; }
  });
  return server;
}

export async function runBusquedaStdioServer(): Promise<void> {
  await createBusquedaServer().connect(new StdioServerTransport());
  logger.info('Busqueda General MCP server running on stdio');
}
