import { Request, Response } from 'express';
import { createPersonaServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
import { getDocumentPrompt, listDocumentTypes } from './prompts.js';

export function createLegalPersonaHttpHandler(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            tools: [
              { name: 'draft_documento', description: 'Draft a Spanish legal document with structured prompts' },
              { name: 'analizar_caso', description: 'Analyze a Spanish legal case' },
              { name: 'estrategia_procesal', description: 'Develop procedural strategy' },
              { name: 'redactar_informe', description: 'Generate a legal opinion' },
              { name: 'responder_consulta', description: 'Answer a legal query' },
            ],
          },
        });
        return;
      }

      if (body.method === 'tools/call') {
        const { name: toolName, arguments: args } = body.params;
        let result: unknown;

        switch (toolName) {
          case 'draft_documento': {
            const { tipo, detalles, formato = 'completo' } = args;
            const prompt = getDocumentPrompt(tipo);
            if (!prompt) {
              result = { error: `Tipo no reconocido: ${tipo}`, disponibles: listDocumentTypes() };
            } else {
              result = {
                tipo_documento: tipo,
                formato_solicitado: formato,
                system_prompt: prompt.systemPrompt,
                user_prompt: prompt.userPromptTemplate.replace('{details}', detalles),
                campos_requeridos: prompt.requiredFields,
                campos_opcionales: prompt.optionalFields,
                instruccion: formato === 'esquema' ? 'Genera solo la estructura/esquema.' : 'Genera el documento completo.',
              };
            }
            break;
          }
          case 'analizar_caso': {
            const { hechos, pretensiones, area_derecho, jurisdiccion, fase_procesal } = args;
            result = {
              system_prompt: `Eres un abogado español senior especializado en ${area_derecho}.`,
              user_prompt: `Analiza el siguiente caso de ${area_derecho}:\n\nHECHOS:\n${hechos}\n\nPRETENSIONES:\n${pretensiones}\n${jurisdiccion ? `\nJURISDICCIÓN: ${jurisdiccion}` : ''}${fase_procesal ? `\nFASE: ${fase_procesal}` : ''}\n\nProporciona análisis estructurado.`,
            };
            break;
          }
          case 'estrategia_procesal': {
            const { hechos, pretensiones, area_derecho, parte, presupuesto } = args;
            result = {
              system_prompt: `Eres un abogado español experto en estrategia procesal.`,
              user_prompt: `Diseña estrategia procesal para caso de ${area_derecho}. Cliente: ${parte}.\n\nHECHOS:\n${hechos}\n\nPRETENSIONES:\n${pretensiones}\n${presupuesto ? `\nPRESUPUESTO: ${presupuesto}` : ''}`,
            };
            break;
          }
          case 'redactar_informe': {
            const { asunto, hechos, preguntas, area_derecho } = args;
            result = {
              system_prompt: `Eres un abogado español especializado en dictámenes.`,
              user_prompt: `Redacta informe jurídico${area_derecho ? ` de ${area_derecho}` : ''}:\n\nASUNTO: ${asunto}\n\nHECHOS: ${hechos}\n\nPREGUNTAS: ${preguntas}`,
            };
            break;
          }
          case 'responder_consulta': {
            const { consulta, contexto, area_derecho } = args;
            result = {
              system_prompt: `Eres un abogado español que responde consultas jurídicas.`,
              user_prompt: `Responde consulta${area_derecho ? ` de ${area_derecho}` : ''}:\n\n${consulta}\n${contexto ? `\nContexto: ${contexto}` : ''}`,
            };
            break;
          }
          default:
            res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
            return;
        }

        res.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        return;
      }

      res.status(400).json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Unknown method: ${body.method}` } });
    } catch (err) {
      logger.error(err, 'Legal Persona HTTP handler error');
      res.status(500).json({ jsonrpc: '2.0', id: req.body?.id, error: { code: -32603, message: String(err) } });
    }
  };
}

export { createPersonaServer };
