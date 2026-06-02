import { Request, Response } from 'express';
import { createDoctrinaServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchDoctrina, searchByAutor } from './client.js';

export function createDoctrinaHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (body.method === 'tools/list') {
        res.json({ jsonrpc: '2.0', id: body.id, result: { tools: [{ name: 'search_doctrina', description: 'Search academic doctrine' }, { name: 'search_by_autor', description: 'Search by author' }] } });
        return;
      }
      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_doctrina': result = await searchDoctrina(args.query, args.source, args.limit); break;
          case 'search_by_autor': result = await searchByAutor(args.autor, args.limit); break;
          default: res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } }); return;
        }
        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }
      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) { logger.error(err, 'Doctrina HTTP handler error'); res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } }); }
  };
}
export { createDoctrinaServer };
