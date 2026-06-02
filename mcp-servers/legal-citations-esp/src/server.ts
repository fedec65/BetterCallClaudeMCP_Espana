import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import {
  validateCitation,
  parseCitation,
  formatCitation,
  convertToEcli,
  convertToBoeId,
  extractCitations,
} from './citations.js';

const tools: Tool[] = [
  {
    name: 'validate_citation',
    description: 'Validate whether a Spanish legal citation is well-formed. Supports BOE identifiers, ECLI, Ley/Ley Orgánica, Real Decreto variants, court decisions (STS, STSJ, AN, AP, JPI), Circular, Orden, and Resolución.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation to validate (e.g., "BOE-A-2015-10566", "ECLI:ES:TS:2020:599", "Ley 39/2015")' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'parse_citation',
    description: 'Parse a Spanish legal citation into its structured components (type, normalized form, URL if available, and extracted fields like number, year, court).',
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation to parse' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'format_citation',
    description: 'Format a Spanish legal citation in a chosen style: official (full), short (abbreviated), or apa.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation to format' },
        format: { type: 'string', enum: ['official', 'short', 'apa'], description: 'Output format' },
      },
      required: ['citation', 'format'],
    },
  },
  {
    name: 'convert_to_ecli',
    description: 'Convert a Spanish court decision citation (e.g., STS 123/2020) to its ECLI form (ECLI:ES:TS:2020:123). Only works for court decisions with convertible formats.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation to convert' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'convert_to_boe_id',
    description: 'Attempt to convert a citation to a BOE identifier. Returns the BOE ID if the citation already is one, otherwise null (conversion requires database lookup).',
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation to convert' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'extract_citations',
    description: 'Extract all Spanish legal citations from a block of text. Returns a list of parsed citations found in the input.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to scan for citations' },
      },
      required: ['text'],
    },
  },
];

export function createCitationsServer(): Server {
  const server = new Server(
    { name: 'legal-citations-esp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'validate_citation': {
          const { citation } = args as { citation: string };
          const result = validateCitation(citation);
          return {
            content: [{ type: 'text', text: JSON.stringify({ citation, ...result }, null, 2) }],
          };
        }
        case 'parse_citation': {
          const { citation } = args as { citation: string };
          const result = parseCitation(citation);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'format_citation': {
          const { citation, format } = args as { citation: string; format: 'official' | 'short' | 'apa' };
          const result = formatCitation(citation, format);
          return {
            content: [{ type: 'text', text: JSON.stringify({ citation, format, result }, null, 2) }],
          };
        }
        case 'convert_to_ecli': {
          const { citation } = args as { citation: string };
          const result = convertToEcli(citation);
          return {
            content: [{ type: 'text', text: JSON.stringify({ citation, ecli: result }, null, 2) }],
          };
        }
        case 'convert_to_boe_id': {
          const { citation } = args as { citation: string };
          const result = convertToBoeId(citation);
          return {
            content: [{ type: 'text', text: JSON.stringify({ citation, boeId: result }, null, 2) }],
          };
        }
        case 'extract_citations': {
          const { text } = args as { text: string };
          const result = extractCitations(text);
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

export async function runCitationsStdioServer(): Promise<void> {
  const server = createCitationsServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Legal Citations ESP MCP server running on stdio');
}
