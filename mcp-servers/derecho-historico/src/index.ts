import { Request, Response } from 'express';
import { createHistoricoServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { searchGazetaHistorica, searchLegislacionHistorica, getTextoHistorico } from './client.js';

export function createHistoricoHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (body.method === 'tools/list') {
        res.json({ jsonrpc: '2.0', id: body.id, result: { tools: [
          { name: 'search_gazeta_historica', description: 'Search historical gazette' },
          { name: 'search_legislacion_historica', description: 'Search historical legislation' },
          { name: 'get_texto_historico', description: 'Get historical text' },
        ] } });
        return;
      }
      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;
        switch (toolName) {
          case 'search_gazeta_historica': result = await searchGazetaHistorica(args.query, args.limit); break;
          case 'search_legislacion_historica': result = await searchLegislacionHistorica(args.query, args.limit); break;
          case 'get_texto_historico': result = await getTextoHistorico(args.id); break;
          default: res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } }); return;
        }
        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }
      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) { logger.error(err, 'Historico HTTP handler error'); res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } }); }
  };
}
export { createHistoricoServer };
