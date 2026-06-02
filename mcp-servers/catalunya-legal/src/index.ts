import { Request, Response } from 'express';
import { createCatalunyaServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchNormaCivilCat, compareCatalanSpanishCivil, getArticuloCivilCat } from './client.js';

export function createCatalunyaHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (body.method === 'tools/list') {
        res.json({ jsonrpc: '2.0', id: body.id, result: { tools: [
          { name: 'search_norma_civil_cat', description: 'Search Catalan civil law' },
          { name: 'compare_catalan_spanish_civil', description: 'Compare Catalan vs Spanish civil' },
          { name: 'get_articulo_civil_cat', description: 'Get Catalan civil article' },
        ] } });
        return;
      }
      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_norma_civil_cat': result = await searchNormaCivilCat(args.query, args.limit); break;
          case 'compare_catalan_spanish_civil': result = await compareCatalanSpanishCivil(args.articulo); break;
          case 'get_articulo_civil_cat': result = await getArticuloCivilCat(args.id); break;
          default: res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } }); return;
        }
        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }
      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) { logger.error(err, 'Catalunya HTTP handler error'); res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } }); }
  };
}
export { createCatalunyaServer };
