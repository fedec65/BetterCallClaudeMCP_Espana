import { Request, Response } from 'express';
import { createCongresoServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchProyectosLey, searchDebates, trackLegislativeStatus } from './client.js';

export function createCongresoHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0', id: body.id,
          result: {
            tools: [
              { name: 'search_proyectos_ley', description: 'Search bills from Congress' },
              { name: 'search_debates', description: 'Search parliamentary debates' },
              { name: 'track_legislative_status', description: 'Track bill status' },
            ],
          },
        });
        return;
      }

      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_proyectos_ley': result = await searchProyectosLey(args); break;
          case 'search_debates': result = await searchDebates(args.texto, args.legislatura, args.limit); break;
          case 'track_legislative_status': result = await trackLegislativeStatus(args.numero, args.anyo); break;
          default:
            res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
            return;
        }
        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }

      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) {
      logger.error(err, 'Congreso HTTP handler error');
      res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } });
    }
  };
}

export { createCongresoServer };
