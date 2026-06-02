import { Request, Response } from 'express';
import { createTcServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchTc, getSentenciaTc, searchByTema } from './client.js';

export function createTcHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0', id: body.id,
          result: {
            tools: [
              { name: 'search_sentencias_tc', description: 'Search TC decisions' },
              { name: 'get_sentencia_tc', description: 'Get TC decision by number/year' },
              { name: 'search_by_tema', description: 'Search TC by subject' },
            ],
          },
        });
        return;
      }

      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_sentencias_tc': result = await searchTc(args); break;
          case 'get_sentencia_tc': result = await getSentenciaTc(args.numero, args.anyo); break;
          case 'search_by_tema': result = await searchByTema(args.tema, args.limit); break;
          default:
            res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
            return;
        }
        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }

      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) {
      logger.error(err, 'TC HTTP handler error');
      res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } });
    }
  };
}

export { createTcServer };
