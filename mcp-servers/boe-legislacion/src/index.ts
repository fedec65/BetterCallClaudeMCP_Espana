import { Request, Response } from 'express';
import { createBoeServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import {
  searchBoe,
  getLegislacion,
  getMetadatos,
  getTextoConsolidado,
  getIndice,
  getBloque,
  getAnalisis,
} from './boe-client.js';

export function createBoeLegislacionHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            tools: [
              {
                name: 'search_boe',
                description: 'Search Spanish consolidated legislation from the BOE',
              },
              {
                name: 'get_legislacion',
                description: 'Retrieve full consolidated norm from BOE by identifier',
              },
              {
                name: 'get_metadatos',
                description: 'Retrieve metadata of a consolidated BOE norm',
              },
              {
                name: 'get_texto_consolidado',
                description: 'Retrieve consolidated text of a BOE norm',
              },
              {
                name: 'get_indice',
                description: 'Retrieve index (list of blocks) of a BOE norm',
              },
              {
                name: 'get_bloque',
                description: 'Retrieve a specific block from a BOE norm',
              },
              {
                name: 'get_analisis',
                description: 'Retrieve legal analysis of a BOE norm',
              },
            ],
          },
        });
        return;
      }

      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;

        switch (toolName) {
          case 'search_boe':
            result = await searchBoe(args);
            break;
          case 'get_legislacion':
            result = await getLegislacion(args.id);
            break;
          case 'get_metadatos':
            result = await getMetadatos(args.id);
            break;
          case 'get_texto_consolidado':
            result = await getTextoConsolidado(args.id);
            break;
          case 'get_indice':
            result = await getIndice(args.id);
            break;
          case 'get_bloque':
            result = await getBloque(args.id, args.id_bloque);
            break;
          case 'get_analisis':
            result = await getAnalisis(args.id);
            break;
          default:
            res.status(400).json({
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32601, message: `Unknown tool: ${toolName}` },
            });
            return;
        }

        res.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        });
        return;
      }

      res.status(400).json({
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32601, message: `Unknown method: ${body.method}` },
      });
    } catch (err) {
      logger.error(err, 'BOE HTTP handler error');
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id,
        error: { code: -32603, message: String(err) },
      });
    }
  };
}

export { createBoeServer };
