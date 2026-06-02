import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchGazetaHistorica, searchLegislacionHistorica, getTextoHistorico } from './client.js';

const tools: Tool[] = [
  { name: 'search_gazeta_historica', description: 'Search the historical gazette collection (1661-1959).', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 10 } }, required: ['query'] } },
  { name: 'search_legislacion_historica', description: 'Search historical Spanish legislation (10th c. to Isabel II) via CEPC.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 10 } }, required: ['query'] } },
  { name: 'get_texto_historico', description: 'Retrieve a historical legal text by identifier.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

export function createHistoricoServer(): Server {
  const server = new Server({ name: 'derecho-historico', version: '1.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case 'search_gazeta_historica': return { content: [{ type: 'text', text: JSON.stringify(await searchGazetaHistorica(String(args?.query), Number(args?.limit)), null, 2) }] };
        case 'search_legislacion_historica': return { content: [{ type: 'text', text: JSON.stringify(await searchLegislacionHistorica(String(args?.query), Number(args?.limit)), null, 2) }] };
        case 'get_texto_historico': return { content: [{ type: 'text', text: JSON.stringify(await getTextoHistorico(String(args?.id)), null, 2) }] };
        default: throw new McpError(ErrorCodes.InvalidRequest, `Unknown tool: ${name}`);
      }
    } catch (err) { logger.error({ err, tool: name }, 'Tool failed'); throw err; }
  });
  return server;
}

export async function runHistoricoStdioServer(): Promise<void> {
  await createHistoricoServer().connect(new StdioServerTransport());
  logger.info('Derecho Historico MCP server running on stdio');
}
