import { Request, Response } from 'express';
import { createBusquedaServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchPortico, searchFindiur, searchMultiSource } from './client.js';

export function createBusquedaHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (body.method === 'tools/list') {
        res.json({ jsonrpc: '2.0', id: body.id, result: { tools: [
          { name: 'search_portico', description: 'Search Portico Legal' },
          { name: 'search_findiur', description: 'Search Findiur' },
          { name: 'search_multi_source', description: 'Search multiple sources' },
        ] } });
        return;
      }
      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_portico': result = await searchPortico(args.query, args.limit); break;
          case 'search_findiur': result = await searchFindiur(args.query, args.limit); break;
          case 'search_multi_source': result = await searchMultiSource(args.query, args.limit); break;
          default: res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } }); return;
        }
        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }
      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) { logger.error(err, 'Busqueda HTTP handler error'); res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } }); }
  };
}
export { createBusquedaServer };
