import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { searchCendoj, getSentenciaByEcli, searchByTribunal } from './client.js';

const tools: Tool[] = [
  {
    name: 'search_jurisprudencia',
    description: 'Search Spanish jurisprudence via CENDOJ (Centro de Documentación Judicial). Covers Supreme Court, National Court, Provincial Courts, and lower courts.',
    inputSchema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Free text search in judgments' },
        tribunal: { type: 'string', description: 'Court name or code (e.g., TS, AN, AP Barcelona)' },
        fecha_desde: { type: 'string', description: 'From date (DD/MM/YYYY)' },
        fecha_hasta: { type: 'string', description: 'To date (DD/MM/YYYY)' },
        ecli: { type: 'string', description: 'ECLI identifier' },
        numero_roj: { type: 'string', description: 'ROJ number' },
        materia: { type: 'string', description: 'Subject matter' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
    },
  },
  {
    name: 'get_sentencia_by_ecli',
    description: 'Retrieve a Spanish court decision by its ECLI identifier.',
    inputSchema: {
      type: 'object',
      properties: {
        ecli: { type: 'string', description: 'ECLI identifier (e.g., ECLI:ES:TS:2020:599)' },
      },
      required: ['ecli'],
    },
  },
  {
    name: 'search_by_tribunal',
    description: 'Search jurisprudence by specific court/tribunal and optional date range.',
    inputSchema: {
      type: 'object',
      properties: {
        tribunal: { type: 'string', description: 'Court name (e.g., Tribunal Supremo, Audiencia Nacional, AP Madrid)' },
        fecha_desde: { type: 'string', description: 'From date (DD/MM/YYYY)' },
        fecha_hasta: { type: 'string', description: 'To date (DD/MM/YYYY)' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['tribunal'],
    },
  },
];

export function createCendojServer(): Server {
  const server = new Server(
    { name: 'cendoj-jurisprudencia', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_jurisprudencia': {
          const result = await searchCendoj(args as Record<string, unknown>);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'get_sentencia_by_ecli': {
          const { ecli } = args as { ecli: string };
          const result = await getSentenciaByEcli(ecli);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'search_by_tribunal': {
          const { tribunal, fecha_desde, fecha_hasta, limit } = args as Record<string, unknown>;
          const result = await searchByTribunal(
            String(tribunal),
            fecha_desde ? String(fecha_desde) : undefined,
            fecha_hasta ? String(fecha_hasta) : undefined,
            limit ? Number(limit) : 10
          );
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

export async function runCendojStdioServer(): Promise<void> {
  const server = createCendojServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('CENDOJ Jurisprudencia MCP server running on stdio');
}
