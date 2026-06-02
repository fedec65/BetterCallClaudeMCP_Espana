import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchEurLex, getEurLexDocument, searchCuria, getEuTreaty } from './client.js';

const tools: Tool[] = [
  {
    name: 'search_eurlex',
    description: 'Search EU legislation, directives, regulations, and decisions on EUR-Lex applicable in Spain.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., GDPR, consumer protection, competition)' },
        lang: { type: 'string', description: 'Language code (es, en, fr, de)', default: 'es' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_eurlex_document',
    description: 'Retrieve an EU document from EUR-Lex by its CELEX number (e.g., 32016R0679 for GDPR).',
    inputSchema: {
      type: 'object',
      properties: {
        celex: { type: 'string', description: 'CELEX number (e.g., 32016R0679)' },
        lang: { type: 'string', description: 'Language code', default: 'es' },
      },
      required: ['celex'],
    },
  },
  {
    name: 'search_curia',
    description: 'Search CJEU (Court of Justice of the EU) case law via Curia.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Case number or search term (e.g., C-311/18, Schrems)' },
        lang: { type: 'string', description: 'Language code', default: 'es' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_eu_treaty',
    description: 'Retrieve an EU treaty text (TFEU, TEU, Euratom, Charta de Derechos Fundamentales).',
    inputSchema: {
      type: 'object',
      properties: {
        treaty: { type: 'string', description: 'Treaty name: tfeu, teu, euratom, charta-derechos-fundamentales' },
        lang: { type: 'string', description: 'Language code', default: 'es' },
      },
      required: ['treaty'],
    },
  },
];

export function createEuLawServer(): Server {
  const server = new Server(
    { name: 'eu-law-esp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_eurlex': {
          const { query, lang = 'es', limit = 10 } = args as { query: string; lang?: string; limit?: number };
          const result = await searchEurLex(query, lang, limit);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'get_eurlex_document': {
          const { celex, lang = 'es' } = args as { celex: string; lang?: string };
          const result = await getEurLexDocument(celex, lang);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'search_curia': {
          const { query, lang = 'es', limit = 10 } = args as { query: string; lang?: string; limit?: number };
          const result = await searchCuria(query, lang, limit);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'get_eu_treaty': {
          const { treaty, lang = 'es' } = args as { treaty: string; lang?: string };
          const result = await getEuTreaty(treaty, lang);
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

export async function runEuLawStdioServer(): Promise<void> {
  const server = createEuLawServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('EU Law ESP MCP server running on stdio');
}
