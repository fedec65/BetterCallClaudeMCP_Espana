export interface DocumentPrompt {
  systemPrompt: string;
  userPromptTemplate: string;
  requiredFields: string[];
  optionalFields: string[];
}

export const documentTypes: Record<string, DocumentPrompt> = {
  demanda: {
    systemPrompt: `Eres un abogado español especializado en redacción de demandas judiciales. Redactas con precisión jurídica, siguiendo la estructura formal del art. 399 LEC y demás normativa procesal aplicable. Utilizas la terminología técnica adecuada y citas normativas correctas.`,
    userPromptTemplate: `Redacta una demanda judicial española con los siguientes datos:

{details}

Estructura requerida:
1. Encabezamiento (Juzgado/Tribunal competente)
2. Sujetos procesales (demandante, demandado, procuradores, abogados)
3. Hechos (numerados y cronológicos)
4. Fundamentos de Derecho (con citas normativas pertinentes)
5. Petición (concreta y determinada)
6. Provisiones (sobre costas, intereses, etc.)
7. Firma y lugar/fecha`,
    requiredFields: ['jurisdiccion', 'materia', 'hechos', 'pretensiones'],
    optionalFields: ['juzgado', 'partes', 'pruebas', 'cuantia', 'fundamentos_derecho'],
  },

  escrito: {
    systemPrompt: `Eres un abogado español experto en redacción de escritos procesales. Redactas con claridad, brevedad y precisión jurídica, siguiendo los requisitos formales del art. 398 LEC y la normativa procesal aplicable.`,
    userPromptTemplate: `Redacta un escrito procesal español con los siguientes datos:

{details}

El escrito debe incluir:
1. Encabezamiento correcto
2. Exposición de motivos clara y concisa
3. Fundamentos de Derecho con citas normativas
4. Súplica concreta
5. Firma`,
    requiredFields: ['tipo_escrito', 'destinatario', 'contenido'],
    optionalFields: ['procedimiento', 'referencia', 'prazos', 'anexos'],
  },

  contrato: {
    systemPrompt: `Eres un abogado mercantilista español especializado en redacción de contratos. Redactas contratos con cláusulas claras, completas y jurídicamente sólidas, siguiendo el Código Civil, la normativa mercantil y la doctrina contractual aplicable.`,
    userPromptTemplate: `Redacta un contrato español con los siguientes datos:

{details}

Estructura del contrato:
1. Encabezamiento e intervinientes
2. Antecedentes/Considerandos
3. Objeto del contrato
4. Obligaciones de las partes
5. Precio/Contraprestación
6. Duración y prórroga
7. Resolución y efectos
8. Confidencialidad (si aplica)
9. Ley aplicable y jurisdicción
10. Firmas`,
    requiredFields: ['tipo_contrato', 'partes', 'objeto'],
    optionalFields: ['precio', 'duracion', 'condiciones_especiales', 'jurisdiccion', 'legislacion_aplicable'],
  },

  informe: {
    systemPrompt: `Eres un abogado español especializado en dictámenes e informes jurídicos. Redactas informes rigurosos, con análisis exhaustivo de la normativa, jurisprudencia y doctrina aplicables.`,
    userPromptTemplate: `Redacta un informe jurídico español con los siguientes datos:

{details}

Estructura del informe:
1. Identificación del asunto
2. Hechos probados
3. Cuestiones jurídicas planteadas
4. Marco normativo aplicable
5. Análisis jurídico detallado
6. Jurisprudencia relevante
7. Conclusiones
8. Recomendaciones`,
    requiredFields: ['asunto', 'hechos', 'preguntas_juridicas'],
    optionalFields: ['area_derecho', 'normativa_aplicable', 'jurisprudencia_conocida', 'plazo_respuesta'],
  },

  recurso: {
    systemPrompt: `Eres un abogado español especializado en recursos procesales (apelación, casación, extraordinario por infracción procesal, etc.). Redactas recursos con estructura formal correcta y argumentación jurídica sólida.`,
    userPromptTemplate: `Redacta un recurso procesal español con los siguientes datos:

{details}

Estructura requerida:
1. Encabezamiento (Órgano jurisdiccional)
2. Sujetos procesales
3. Resolución impugnada
4. Hechos (si es necesario)
5. Fundamentos de Derecho (con citas normativas y jurisprudenciales)
6. Súplica
7. Firma`,
    requiredFields: ['tipo_recurso', 'resolucion_impugnada', 'fundamentos'],
    optionalFields: ['jurisdiccion', 'procedimiento', 'partes', 'pruebas_nuevas'],
  },

  diligencia: {
    systemPrompt: `Eres un abogado español experto en diligencias de ordenación y actuaciones procesales. Redactas con formalidad y precisión.`,
    userPromptTemplate: `Redacta una diligencia o actuación procesal española con los siguientes datos:

{details}`,
    requiredFields: ['tipo_diligencia', 'contenido'],
    optionalFields: ['procedimiento', 'juzgado', 'partes'],
  },

  poder: {
    systemPrompt: `Eres un notario/abogado español especializado en poderes y representación procesal. Redactas poderes con las facultades necesarias y suficientes.`,
    userPromptTemplate: `Redacta un poder notarial o representación procesal español con los siguientes datos:

{details}

Debe especificar:
1. Poderdante y apoderado
2. Facultades otorgadas (generales o específicas)
3. Ámbito de aplicación
4. Límites (si los hay)`,
    requiredFields: ['poderdante', 'apoderado', 'facultades'],
    optionalFields: ['ambito', 'limitaciones', 'plazo'],
  },

  memoria: {
    systemPrompt: `Eres un abogado español especializado en memoriales y alegaciones. Redactas con argumentación jurídica sólida, citando normativa, jurisprudencia y doctrina.`,
    userPromptTemplate: `Redacta un memorial o alegaciones español con los siguientes datos:

{details}

Debe incluir:
1. Encabezamiento
2. Antecedentes procesales
3. Argumentación jurídica detallada
4. Citas normativas y jurisprudenciales
5. Súplica`,
    requiredFields: ['asunto', 'argumentos'],
    optionalFields: ['procedimiento', 'jurisdiccion', 'partes', 'jurisprudencia_citar'],
  },

  providencia: {
    systemPrompt: `Eres un magistrado/juez español. Redactas providencias con la estructura y formalidad propias de la función jurisdiccional.`,
    userPromptTemplate: `Redacta una providencia judicial española con los siguientes datos:

{details}

Debe incluir:
1. Encabezamiento (Órgano, procedimiento, partes)
2. Antecedentes
3. Fundamentos de Derecho
4. Resolución (fallo/dispositivo)
5. Notificaciones`,
    requiredFields: ['asunto', 'resolucion'],
    optionalFields: ['juzgado', 'procedimiento', 'partes', 'antecedentes'],
  },

  minuta: {
    systemPrompt: `Eres un abogado español. Redactas minutas de honorarios profesionales claras y detalladas.`,
    userPromptTemplate: `Redacta una minuta de honorarios profesionales española con los siguientes datos:

{details}

Debe incluir:
1. Datos del cliente y del profesional
2. Conceptos de actuación
3. Honorarios por concepto
4. Gastos y costas
5. Total
6. Forma de pago`,
    requiredFields: ['cliente', 'conceptos'],
    optionalFields: ['base_honorarios', 'gastos', 'iva', 'forma_pago'],
  },

  carta: {
    systemPrompt: `Eres un abogado español. Redactas cartas y comunicaciones formales con tono profesional y jurídico.`,
    userPromptTemplate: `Redacta una carta/comunicación formal española con los siguientes datos:

{details}

Debe incluir:
1. Encabezamiento
2. Referencia del asunto
3. Cuerpo de la carta
4. Despedida formal
5. Firma`,
    requiredFields: ['destinatario', 'asunto', 'contenido'],
    optionalFields: ['remitente', 'referencia', 'plazo', 'tono'],
  },

  consulta: {
    systemPrompt: `Eres un abogado español especializado en consultoría jurídica. Respondes consultas con claridad, citando la normativa aplicable y la jurisprudencia relevante.`,
    userPromptTemplate: `Responde a la siguiente consulta jurídica española:

{details}

Responde de forma clara y estructurada, citando:
1. Normativa aplicable
2. Jurisprudencia relevante (si la conoces)
3. Conclusión práctica`,
    requiredFields: ['consulta'],
    optionalFields: ['area_derecho', 'hechos', 'jurisdiccion'],
  },
};

export function getDocumentPrompt(tipo: string): DocumentPrompt | undefined {
  return documentTypes[tipo.toLowerCase()];
}

export function listDocumentTypes(): string[] {
  return Object.keys(documentTypes);
}
