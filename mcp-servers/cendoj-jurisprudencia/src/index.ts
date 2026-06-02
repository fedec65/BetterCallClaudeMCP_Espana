import { Request, Response } from 'express';
import { createCendojServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchCendoj, getSentenciaByEcli, searchByTribunal } from './client.js';

export function createCendojHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0', id: body.id,
          result: {
            tools: [
              { name: 'search_jurisprudencia', description: 'Search CENDOJ jurisprudence' },
              { name: 'get_sentencia_by_ecli', description: 'Get decision by ECLI' },
              { name: 'search_by_tribunal', description: 'Search by court' },
            ],
          },
        });
        return;
      }

      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_jurisprudencia': result = await searchCendoj(args); break;
          case 'get_sentencia_by_ecli': result = await getSentenciaByEcli(args.ecli); break;
          case 'search_by_tribunal':
            result = await searchByTribunal(args.tribunal, args.fecha_desde, args.fecha_hasta, args.limit);
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
      logger.error(err, 'CENDOJ HTTP handler error');
      res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } });
    }
  };
}

export { createCendojServer };
