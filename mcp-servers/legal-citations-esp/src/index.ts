import { Request, Response } from 'express';
import { createCitationsServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import {
  validateCitation,
  parseCitation,
  formatCitation,
  convertToEcli,
  convertToBoeId,
  extractCitations,
} from './citations.js';

export function createLegalCitationsHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            tools: [
              { name: 'validate_citation', description: 'Validate a Spanish legal citation' },
              { name: 'parse_citation', description: 'Parse a citation into components' },
              { name: 'format_citation', description: 'Format a citation in a chosen style' },
              { name: 'convert_to_ecli', description: 'Convert to ECLI format' },
              { name: 'convert_to_boe_id', description: 'Convert to BOE identifier' },
              { name: 'extract_citations', description: 'Extract citations from text' },
            ],
          },
        });
        return;
      }

      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;

        switch (toolName) {
          case 'validate_citation':
            result = { citation: args.citation, ...validateCitation(args.citation) };
            break;
          case 'parse_citation':
            result = parseCitation(args.citation);
            break;
          case 'format_citation':
            result = { citation: args.citation, format: args.format, result: formatCitation(args.citation, args.format) };
            break;
          case 'convert_to_ecli':
            result = { citation: args.citation, ecli: convertToEcli(args.citation) };
            break;
          case 'convert_to_boe_id':
            result = { citation: args.citation, boeId: convertToBoeId(args.citation) };
            break;
          case 'extract_citations':
            result = extractCitations(args.text);
            break;
          default:
            res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
            return;
        }

        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }

      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) {
      logger.error(err, 'Legal Citations HTTP handler error');
      res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } });
    }
  };
}

export { createCitationsServer };
