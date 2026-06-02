import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';
import { getDocumentPrompt, listDocumentTypes } from './prompts.js';

const tools: Tool[] = [
  {
    name: 'draft_documento',
    description: 'Draft a Spanish legal document (demanda, escrito, contrato, recurso, informe, poder, memorial, providencia, minuta, carta). Returns a structured prompt with system instructions and template that the LLM can use to generate the document.',
    inputSchema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', description: 'Document type: demanda, escrito, contrato, recurso, informe, poder, memorial, providencia, minuta, carta, consulta' },
        detalles: { type: 'string', description: 'Detailed description of the document content, parties, facts, and legal basis' },
        formato: { type: 'string', description: 'Output format: completo (full draft) or esquema (outline/structure only)', default: 'completo' },
      },
      required: ['tipo', 'detalles'],
    },
  },
  {
    name: 'analizar_caso',
    description: 'Analyze a Spanish legal case. Returns a structured analytical framework covering: applicable law, relevant jurisprudence, procedural strategy, strengths/weaknesses, and recommended actions.',
    inputSchema: {
      type: 'object',
      properties: {
        hechos: { type: 'string', description: 'Factual background of the case' },
        pretensiones: { type: 'string', description: 'Claims or objectives of the client' },
        area_derecho: { type: 'string', description: 'Area of law (civil, penal, laboral, administrativo, mercantil, constitucional)' },
        jurisdiccion: { type: 'string', description: 'Jurisdiction (civil, penal, social, contencioso-administrativo, mercantil)' },
        fase_procesal: { type: 'string', description: 'Current procedural phase (previo, primera instancia, apelación, casación, ejecución)' },
      },
      required: ['hechos', 'pretensiones', 'area_derecho'],
    },
  },
  {
    name: 'estrategia_procesal',
    description: 'Develop a procedural strategy for a Spanish legal case. Covers: choice of court/venue, procedural route, interim measures, evidence strategy, timeline, and risk assessment.',
    inputSchema: {
      type: 'object',
      properties: {
        hechos: { type: 'string', description: 'Factual background' },
        pretensiones: { type: 'string', description: 'Claims/objectives' },
        area_derecho: { type: 'string', description: 'Area of law' },
        parte: { type: 'string', description: 'Client position: demandante, demandado, querellante, imputado, recurrente, recurrido' },
        presupuesto: { type: 'string', description: 'Budget constraints (optional)' },
      },
      required: ['hechos', 'pretensiones', 'area_derecho', 'parte'],
    },
  },
  {
    name: 'redactar_informe',
    description: 'Generate a structured legal opinion (informe jurídico) on a Spanish legal question. Covers: applicable law, jurisprudence, doctrinal analysis, and conclusion.',
    inputSchema: {
      type: 'object',
      properties: {
        asunto: { type: 'string', description: 'Subject matter of the legal opinion' },
        hechos: { type: 'string', description: 'Relevant facts' },
        preguntas: { type: 'string', description: 'Specific legal questions to answer' },
        area_derecho: { type: 'string', description: 'Area of law' },
      },
      required: ['asunto', 'hechos', 'preguntas'],
    },
  },
  {
    name: 'responder_consulta',
    description: 'Answer a general Spanish legal query with structured response including applicable legislation, relevant jurisprudence, and practical conclusions.',
    inputSchema: {
      type: 'object',
      properties: {
        consulta: { type: 'string', description: 'The legal question' },
        contexto: { type: 'string', description: 'Additional context (optional)' },
        area_derecho: { type: 'string', description: 'Area of law (optional)' },
      },
      required: ['consulta'],
    },
  },
];

export function createPersonaServer(): Server {
  const server = new Server(
    { name: 'legal-persona-esp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'draft_documento': {
          const { tipo, detalles, formato = 'completo' } = args as { tipo: string; detalles: string; formato?: string };
          const prompt = getDocumentPrompt(tipo);
          if (!prompt) {
            return {
              content: [{ type: 'text', text: `Tipo de documento no reconocido: "${tipo}". Tipos disponibles: ${listDocumentTypes().join(', ')}` }],
            };
          }

          const userPrompt = prompt.userPromptTemplate.replace('{details}', detalles);
          const systemPrompt = prompt.systemPrompt;

          const result = {
            tipo_documento: tipo,
            formato_solicitado: formato,
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            campos_requeridos: prompt.requiredFields,
            campos_opcionales: prompt.optionalFields,
            instruccion: formato === 'esquema'
              ? 'Genera solo la estructura/esquema del documento con los encabezamientos y puntos clave, sin desarrollar el contenido completo.'
              : 'Genera el documento completo con todo el contenido desarrollado, siguiendo la estructura indicada.',
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'analizar_caso': {
          const { hechos, pretensiones, area_derecho, jurisdiccion, fase_procesal } = args as Record<string, string>;
          const result = {
            system_prompt: `Eres un abogado español senior especializado en ${area_derecho}. Realizas análisis de casos con rigor jurídico, identificando los puntos clave, la normativa aplicable, la jurisprudencia relevante y las opciones procesales.`,
            user_prompt: `Analiza el siguiente caso de ${area_derecho}:

**HECHOS:**
${hechos}

**PRETENSIONES:**
${pretensiones}

${jurisdiccion ? `**JURISDICCIÓN:** ${jurisdiccion}` : ''}
${fase_procesal ? `**FASE PROCESAL ACTUAL:** ${fase_procesal}` : ''}

Proporciona un análisis estructurado que incluya:
1. Identificación del problema jurídico principal
2. Normativa aplicable (leyes, reglamentos, directivas UE)
3. Jurisprudencia relevante del Tribunal Supremo, Tribunal Constitucional y/o TJUE
4. Fortalezas y debilidades del caso
5. Riesgos y obstáculos
6. Opciones procesales disponibles
7. Recomendación estratégica`,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'estrategia_procesal': {
          const { hechos, pretensiones, area_derecho, parte, presupuesto } = args as Record<string, string>;
          const result = {
            system_prompt: `Eres un abogado español experto en estrategia procesal. Diseñas estrategias procesales óptimas considerando el tribunal competente, la vía procesal más adecuada, las medidas cautelares, la prueba, los plazos y el análisis de riesgos.`,
            user_prompt: `Diseña una estrategia procesal para un caso de ${area_derecho} donde el cliente actúa como ${parte}:

**HECHOS:**
${hechos}

**PRETENSIONES:**
${pretensiones}

${presupuesto ? `**PRESUPUESTO:** ${presupuesto}` : ''}

La estrategia debe incluir:
1. Tribunal/Juzgado competente y fundamento de competencia
2. Vía procesal recomendada y por qué
3. Medidas cautelares o interim measures a considerar
4. Estrategia probatoria (qué pruebas, cómo obtenerlas)
5. Plazos procesales clave
6. Posibles incidentes y contradicciones de la contraparte
7. Análisis de riesgos y escenarios
8. Costes estimados y fianzas
9. Plan de actuación por fases`,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'redactar_informe': {
          const { asunto, hechos, preguntas, area_derecho } = args as Record<string, string>;
          const result = {
            system_prompt: `Eres un abogado español especializado en dictámenes e informes jurídicos. Redactas informes rigurosos con análisis exhaustivo de la normativa, jurisprudencia y doctrina aplicables.`,
            user_prompt: `Redacta un informe jurídico sobre el siguiente asunto${area_derecho ? ` de ${area_derecho}` : ''}:

**ASUNTO:**
${asunto}

**HECHOS:**
${hechos}

**PREGUNTAS JURÍDICAS:**
${preguntas}

Estructura del informe:
1. Identificación del asunto y ámbito del dictamen
2. Hechos relevantes (síntesis)
3. Marco normativo aplicable
4. Análisis jurídico detallado por cada pregunta
5. Jurisprudencia relevante (TS, TC, TJUE)
6. Doctrina aplicable
7. Conclusiones por cada pregunta
8. Recomendaciones prácticas`,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        case 'responder_consulta': {
          const { consulta, contexto, area_derecho } = args as Record<string, string>;
          const result = {
            system_prompt: `Eres un abogado español que responde consultas jurídicas con claridad, precisión y rigor. Citas la normativa aplicable y la jurisprudencia relevante. Indicas siempre cuando una cuestión es controvertida o depende de la interpretación de los tribunales.`,
            user_prompt: `Responde a la siguiente consulta jurídica española${area_derecho ? ` en materia de ${area_derecho}` : ''}:

**CONSULTA:**
${consulta}

${contexto ? `**CONTEXTO ADICIONAL:**\n${contexto}` : ''}

Responde de forma estructurada:
1. Respuesta directa a la pregunta
2. Fundamento legal (artículos, leyes, reglamentos aplicables)
3. Jurisprudencia relevante (si existe)
4. Matices o controversias doctrinales
5. Conclusión práctica y recomendación`,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        default:
          throw new McpError(ErrorCodes.InvalidRequest, `Unknown tool: ${name}`);
      }
    } catch (err) {
      logger.error({ err, tool: name }, 'Tool execution failed');
      throw err;
    }
  });

  return server;
}

export async function runPersonaStdioServer(): Promise<void> {
  const server = createPersonaServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Legal Persona ESP MCP server running on stdio');
}
