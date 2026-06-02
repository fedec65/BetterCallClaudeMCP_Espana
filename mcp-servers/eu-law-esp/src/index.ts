import { Request, Response } from 'express';
import { createEuLawServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchEurLex, getEurLexDocument, searchCuria, getEuTreaty } from './client.js';

export function createEuLawHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0', id: body.id,
          result: {
            tools: [
              { name: 'search_eurlex', description: 'Search EU legislation on EUR-Lex' },
              { name: 'get_eurlex_document', description: 'Get EU document by CELEX' },
              { name: 'search_curia', description: 'Search CJEU case law' },
              { name: 'get_eu_treaty', description: 'Get EU treaty text' },
            ],
          },
        });
        return;
      }

      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_eurlex': result = await searchEurLex(args.query, args.lang, args.limit); break;
          case 'get_eurlex_document': result = await getEurLexDocument(args.celex, args.lang); break;
          case 'search_curia': result = await searchCuria(args.query, args.lang, args.limit); break;
          case 'get_eu_treaty': result = await getEuTreaty(args.treaty, args.lang); break;
          default:
            res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
            return;
        }
        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }

      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) {
      logger.error(err, 'EU Law HTTP handler error');
      res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } });
    }
  };
}

export { createEuLawServer };
