import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchNormaCivilCat, compareCatalanSpanishCivil, getArticuloCivilCat } from './client.js';

const tools: Tool[] = [
  { name: 'search_norma_civil_cat', description: 'Search Catalan civil legislation (Projecte Norma Civil, Universitat de Girona).', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 10 } }, required: ['query'] } },
  { name: 'compare_catalan_spanish_civil', description: 'Compare Catalan civil law with Spanish civil code for a specific article/topic.', inputSchema: { type: 'object', properties: { articulo: { type: 'string' } }, required: ['articulo'] } },
  { name: 'get_articulo_civil_cat', description: 'Retrieve a specific Catalan civil law article.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

export function createCatalunyaServer(): Server {
  const server = new Server({ name: 'catalunya-legal', version: '1.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case 'search_norma_civil_cat': return { content: [{ type: 'text', text: JSON.stringify(await searchNormaCivilCat(String(args?.query), Number(args?.limit)), null, 2) }] };
        case 'compare_catalan_spanish_civil': return { content: [{ type: 'text', text: JSON.stringify(await compareCatalanSpanishCivil(String(args?.articulo)), null, 2) }] };
        case 'get_articulo_civil_cat': return { content: [{ type: 'text', text: JSON.stringify(await getArticuloCivilCat(String(args?.id)), null, 2) }] };
        default: throw new McpError(ErrorCodes.InvalidRequest, `Unknown tool: ${name}`);
      }
    } catch (err) { logger.error({ err, tool: name }, 'Tool failed'); throw err; }
  });
  return server;
}

export async function runCatalunyaStdioServer(): Promise<void> {
  await createCatalunyaServer().connect(new StdioServerTransport());
  logger.info('Catalunya Legal MCP server running on stdio');
}
