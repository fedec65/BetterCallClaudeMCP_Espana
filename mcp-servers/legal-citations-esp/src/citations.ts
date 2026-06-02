// Spanish legal citation patterns

export const CITATION_PATTERNS = {
  // BOE identifiers
  boe: /^BOE-[ABST]-\d{4}-\d+$/i,

  // ECLI
  ecli: /^ECLI:ES:([A-Z]+):(\d{4}):(\d+[A-Z]?)$/i,

  // Ley / Ley Orgánica
  ley: /^(Ley\s+|L\.?\s+)?(?:Org[aá]nica\s+)?(\d+)\/(\d{4})\b/i,
  leyOrganica: /^(Ley\s+)?Org[aá]nica\s+(\d+)\/(\d{4})\b/i,

  // Real Decreto variants
  realDecreto: /^Real\s+Decreto\s+(\d+)\/(\d{4})\b/i,
  realDecretoLey: /^Real\s+Decreto-ley\s+(\d+)\/(\d{4})\b/i,
  realDecretoLegislativo: /^Real\s+Decreto\s+Legislativo\s+(\d+)\/(\d{4})\b/i,

  // Court decisions
  sts: /^STS\s+(\d+)\/(\d{4})\b/i,
  stsj: /^STSJ\s+([A-Z\s]+)\s+(\d+)\/(\d{4})\b/i,
  an: /^AN\s+(\d+)\/(\d{4})\b/i,
  ap: /^AP\s+([A-Z\s]+)\s+(\d+)\/(\d{4})\b/i,
  jpi: /^JPI\s+([A-Z\s]+)\s+(\d+)\/(\d{4})\b/i,

  // Circular / Orden / Resolución
  circular: /^Circular\s+(\d+)\/(\d{4})\b/i,
  orden: /^Orden\s+([A-Z\s\/]+)\/(\d{4})\b/i,
  resolucion: /^Resoluci[oó]n\s+([\d\/]+)\b/i,
};

export interface ParsedCitation {
  type: string;
  raw: string;
  normalized: string;
  components: Record<string, string>;
  isValid: boolean;
  url?: string;
}

export function validateCitation(citation: string): { valid: boolean; type?: string } {
  const trimmed = citation.trim();

  if (CITATION_PATTERNS.boe.test(trimmed)) return { valid: true, type: 'boe' };
  if (CITATION_PATTERNS.ecli.test(trimmed)) return { valid: true, type: 'ecli' };
  if (CITATION_PATTERNS.leyOrganica.test(trimmed)) return { valid: true, type: 'ley-organica' };
  if (CITATION_PATTERNS.ley.test(trimmed)) return { valid: true, type: 'ley' };
  if (CITATION_PATTERNS.realDecretoLegislativo.test(trimmed)) return { valid: true, type: 'real-decreto-legislativo' };
  if (CITATION_PATTERNS.realDecretoLey.test(trimmed)) return { valid: true, type: 'real-decreto-ley' };
  if (CITATION_PATTERNS.realDecreto.test(trimmed)) return { valid: true, type: 'real-decreto' };
  if (CITATION_PATTERNS.sts.test(trimmed)) return { valid: true, type: 'sts' };
  if (CITATION_PATTERNS.stsj.test(trimmed)) return { valid: true, type: 'stsj' };
  if (CITATION_PATTERNS.an.test(trimmed)) return { valid: true, type: 'an' };
  if (CITATION_PATTERNS.ap.test(trimmed)) return { valid: true, type: 'ap' };
  if (CITATION_PATTERNS.jpi.test(trimmed)) return { valid: true, type: 'jpi' };
  if (CITATION_PATTERNS.circular.test(trimmed)) return { valid: true, type: 'circular' };
  if (CITATION_PATTERNS.orden.test(trimmed)) return { valid: true, type: 'orden' };
  if (CITATION_PATTERNS.resolucion.test(trimmed)) return { valid: true, type: 'resolucion' };

  return { valid: false };
}

export function parseCitation(citation: string): ParsedCitation {
  const trimmed = citation.trim();
  const base: ParsedCitation = {
    type: 'unknown',
    raw: trimmed,
    normalized: trimmed,
    components: {},
    isValid: false,
  };

  // BOE
  const boeMatch = trimmed.match(CITATION_PATTERNS.boe);
  if (boeMatch) {
    return {
      ...base,
      type: 'boe',
      isValid: true,
      normalized: trimmed.toUpperCase(),
      components: { id: trimmed.toUpperCase() },
      url: `https://www.boe.es/buscar/act.php?id=${trimmed.toUpperCase()}`,
    };
  }

  // ECLI
  const ecliMatch = trimmed.match(CITATION_PATTERNS.ecli);
  if (ecliMatch) {
    const [, court, year, number] = ecliMatch;
    return {
      ...base,
      type: 'ecli',
      isValid: true,
      normalized: trimmed.toUpperCase(),
      components: { court, year, number },
      url: `https://www.poderjudicial.es/search/indexAN.jsp?ecli=${trimmed.toUpperCase()}`,
    };
  }

  // Ley Orgánica
  const loMatch = trimmed.match(CITATION_PATTERNS.leyOrganica);
  if (loMatch) {
    const [, , number, year] = loMatch;
    return {
      ...base,
      type: 'ley-organica',
      isValid: true,
      normalized: `Ley Orgánica ${number}/${year}`,
      components: { number, year },
    };
  }

  // Ley
  const leyMatch = trimmed.match(CITATION_PATTERNS.ley);
  if (leyMatch) {
    const [, , number, year] = leyMatch;
    return {
      ...base,
      type: 'ley',
      isValid: true,
      normalized: `Ley ${number}/${year}`,
      components: { number, year },
    };
  }

  // Real Decreto Legislativo
  const rdlMatch = trimmed.match(CITATION_PATTERNS.realDecretoLegislativo);
  if (rdlMatch) {
    const [, number, year] = rdlMatch;
    return {
      ...base,
      type: 'real-decreto-legislativo',
      isValid: true,
      normalized: `Real Decreto Legislativo ${number}/${year}`,
      components: { number, year },
    };
  }

  // Real Decreto-ley
  const rdlLeyMatch = trimmed.match(CITATION_PATTERNS.realDecretoLey);
  if (rdlLeyMatch) {
    const [, number, year] = rdlLeyMatch;
    return {
      ...base,
      type: 'real-decreto-ley',
      isValid: true,
      normalized: `Real Decreto-ley ${number}/${year}`,
      components: { number, year },
    };
  }

  // Real Decreto
  const rdMatch = trimmed.match(CITATION_PATTERNS.realDecreto);
  if (rdMatch) {
    const [, number, year] = rdMatch;
    return {
      ...base,
      type: 'real-decreto',
      isValid: true,
      normalized: `Real Decreto ${number}/${year}`,
      components: { number, year },
    };
  }

  // STS
  const stsMatch = trimmed.match(CITATION_PATTERNS.sts);
  if (stsMatch) {
    const [, number, year] = stsMatch;
    return {
      ...base,
      type: 'sts',
      isValid: true,
      normalized: `STS ${number}/${year}`,
      components: { number, year },
      url: `https://www.poderjudicial.es/search/indexAN.jsp?texto=${encodeURIComponent(`STS ${number}/${year}`)}`,
    };
  }

  // STSJ
  const stsjMatch = trimmed.match(CITATION_PATTERNS.stsj);
  if (stsjMatch) {
    const [, ccaa, number, year] = stsjMatch;
    return {
      ...base,
      type: 'stsj',
      isValid: true,
      normalized: `STSJ ${ccaa.trim()} ${number}/${year}`,
      components: { ccaa: ccaa.trim(), number, year },
    };
  }

  return base;
}

export function formatCitation(citation: string, format: 'official' | 'apa' | 'short'): string {
  const parsed = parseCitation(citation);
  if (!parsed.isValid) return citation;

  switch (format) {
    case 'official':
      return parsed.normalized;
    case 'short':
      if (parsed.type === 'ley-organica') {
        return `LO ${parsed.components.number}/${parsed.components.year}`;
      }
      if (parsed.type === 'ley') {
        return `Ley ${parsed.components.number}/${parsed.components.year}`;
      }
      if (parsed.type === 'real-decreto') {
        return `RD ${parsed.components.number}/${parsed.components.year}`;
      }
      if (parsed.type === 'sts') {
        return `STS ${parsed.components.number}/${parsed.components.year}`;
      }
      return parsed.normalized;
    case 'apa':
      return `${parsed.normalized}, BOE.`;
    default:
      return parsed.normalized;
  }
}

export function convertToEcli(citation: string): string | null {
  const parsed = parseCitation(citation);

  // Already ECLI
  if (parsed.type === 'ecli') return parsed.normalized;

  // Court decisions
  if (parsed.type === 'sts') {
    return `ECLI:ES:TS:${parsed.components.year}:${parsed.components.number}`;
  }

  return null;
}

export function convertToBoeId(citation: string): string | null {
  const parsed = parseCitation(citation);

  // Already BOE
  if (parsed.type === 'boe') return parsed.normalized;

  // Cannot convert without searching
  return null;
}

export function extractCitations(text: string): ParsedCitation[] {
  const patterns = [
    { regex: /BOE-[ABST]-\d{4}-\d+/gi, type: 'boe' },
    { regex: /ECLI:ES:[A-Z]+:\d{4}:\d+[A-Z]?/gi, type: 'ecli' },
    { regex: /Ley Org[aá]nica \d+\/\d{4}/gi, type: 'ley-organica' },
    { regex: /Ley \d+\/\d{4}/gi, type: 'ley' },
    { regex: /Real Decreto Legislativo \d+\/\d{4}/gi, type: 'real-decreto-legislativo' },
    { regex: /Real Decreto-ley \d+\/\d{4}/gi, type: 'real-decreto-ley' },
    { regex: /Real Decreto \d+\/\d{4}/gi, type: 'real-decreto' },
    { regex: /STS \d+\/\d{4}/gi, type: 'sts' },
    { regex: /STSJ [A-Z\s]+ \d+\/\d{4}/gi, type: 'stsj' },
    { regex: /AN \d+\/\d{4}/gi, type: 'an' },
  ];

  const found = new Set<string>();
  const results: ParsedCitation[] = [];

  for (const { regex } of patterns) {
    const matches = text.match(regex);
    if (matches) {
      for (const match of matches) {
        if (!found.has(match)) {
          found.add(match);
          results.push(parseCitation(match));
        }
      }
    }
  }

  return results;
}
