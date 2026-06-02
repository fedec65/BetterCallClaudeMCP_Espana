import { resilientFetch, McpError, ErrorCodes } from '@bettercallclaude/esp-shared';

const EUR_LEX_SEARCH = 'https://eur-lex.europa.eu/search.html';
const EUR_LEX_CONTENT = 'https://eur-lex.europa.eu/legal-content';
const CURIA_SEARCH = 'https://curia.europa.eu/juris/liste.jsf';

export async function searchEurLex(query: string, lang = 'es', limit = 10): Promise<unknown> {
  const url = new URL(EUR_LEX_SEARCH);
  url.searchParams.set('text', query);
  url.searchParams.set('lang', lang);
  url.searchParams.set('scope', 'EURLEX');
  url.searchParams.set('type', 'quick');

  const response = await resilientFetch(url.toString());
  const html = await response.text();

  // Basic extraction: find CELEX links and titles
  const results: Array<{ title: string; celex: string; url: string; date?: string }> = [];
  const celexRegex = /CELEX:(\d+[A-Za-z0-9]+)/g;

  let match;
  const celexSet = new Set<string>();
  while ((match = celexRegex.exec(html)) !== null && results.length < limit) {
    const celex = match[1];
    if (!celexSet.has(celex)) {
      celexSet.add(celex);
      results.push({
        title: `CELEX ${celex}`,
        celex,
        url: `https://eur-lex.europa.eu/legal-content/${lang}/TXT/?uri=CELEX:${celex}`,
      });
    }
  }

  return { source: 'eur-lex', query, results };
}

export async function getEurLexDocument(celex: string, lang = 'es'): Promise<unknown> {
  const url = `${EUR_LEX_CONTENT}/${lang}/TXT/?uri=CELEX:${encodeURIComponent(celex)}`;
  const response = await resilientFetch(url);
  const html = await response.text();

  // Extract title from HTML
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s*\|\s*EUR-Lex/i, '').trim() : 'Unknown';

  return {
    celex,
    title,
    url,
    language: lang,
    content_preview: html.substring(0, 500),
  };
}

export async function searchCuria(query: string, lang = 'es', limit = 10): Promise<unknown> {
  const url = new URL(CURIA_SEARCH);
  url.searchParams.set('language', lang);
  url.searchParams.set('jur', 'C,T,F');
  url.searchParams.set('num', query);

  const response = await resilientFetch(url.toString());
  const html = await response.text();

  const results: Array<{ title: string; caseNumber: string; url: string; date?: string }> = [];
  const caseRegex = /C-\d+\/\d+/gi;
  const caseSet = new Set<string>();

  let match;
  while ((match = caseRegex.exec(html)) !== null && results.length < limit) {
    const caseNum = match[0];
    if (!caseSet.has(caseNum)) {
      caseSet.add(caseNum);
      results.push({
        title: `Case ${caseNum}`,
        caseNumber: caseNum,
        url: `https://curia.europa.eu/juris/document/document.jsf?text=&docid=&pageIndex=0&doclang=${lang}&mode=req&dir=&occ=first&part=1&cid=`,
      });
    }
  }

  return { source: 'curia', query, results };
}

export async function getEuTreaty(treaty: string, lang = 'es'): Promise<unknown> {
  const treatyMap: Record<string, string> = {
    tfeu: '12012E',
    teu: '12012M',
    euratom: '12012A',
    'charta-derechos-fundamentales': '12012P',
  };

  const celex = treatyMap[treaty.toLowerCase()];
  if (!celex) {
    throw new McpError(ErrorCodes.ResourceNotFound, `Unknown treaty: ${treaty}. Known: ${Object.keys(treatyMap).join(', ')}`);
  }

  return getEurLexDocument(celex, lang);
}
