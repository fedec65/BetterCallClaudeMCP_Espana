# MCP Servers Reference — BetterCallClaude España

## Endpoint

All servers are exposed via the HTTP aggregator at `https://mcp.bettercallclaude.es`.

Each server is available at `https://mcp.bettercallclaude.es/<server-name>/mcp`.

---

## boe-legislacion

Source: Agencia Estatal Boletín Oficial del Estado (BOE)

| Tool | Description |
|------|-------------|
| `search_boe` | Search consolidated legislation by text, title, type, department, subject, date range |
| `get_legislacion` | Retrieve full norm by BOE identifier |
| `get_metadatos` | Retrieve metadata only |
| `get_texto_consolidado` | Retrieve consolidated text |
| `get_indice` | Retrieve text index (list of blocks/articles) |
| `get_bloque` | Retrieve specific block by ID |
| `get_analisis` | Retrieve legal analysis (materias, notas, referencias) |

---

## cendoj-jurisprudencia

Source: Centro de Documentación Judicial (CENDOJ)

| Tool | Description |
|------|-------------|
| `search_jurisprudencia` | Search court decisions by text, tribunal, date, ECLI, ROJ |
| `get_sentencia_by_ecli` | Retrieve decision by ECLI identifier |
| `search_by_tribunal` | Search by specific court and date range |

---

## tribunal-constitucional

Source: Tribunal Constitucional

| Tool | Description |
|------|-------------|
| `search_sentencias_tc` | Search TC decisions by text, number, year, type, subject |
| `get_sentencia_tc` | Retrieve TC decision by number and year |
| `search_by_tema` | Search by subject matter |

---

## eu-law-esp

Sources: EUR-Lex, Curia (CJEU)

| Tool | Description |
|------|-------------|
| `search_eurlex` | Search EU legislation by keyword |
| `get_eurlex_document` | Retrieve EU document by CELEX number |
| `search_curia` | Search CJEU case law |
| `get_eu_treaty` | Retrieve EU treaty (TFEU, TEU, Euratom, Charta) |

---

## congreso-debates

Source: Congreso de los Diputados

| Tool | Description |
|------|-------------|
| `search_proyectos_ley` | Search bills and legislative initiatives |
| `search_debates` | Search parliamentary debates and interventions |
| `track_legislative_status` | Track status of a specific bill |

---

## legal-citations-esp

Utility server — no external API.

| Tool | Description |
|------|-------------|
| `validate_citation` | Validate Spanish legal citation format |
| `parse_citation` | Parse citation into structured components |
| `format_citation` | Format citation (official, short, apa) |
| `convert_to_ecli` | Convert court citation to ECLI |
| `convert_to_boe_id` | Convert to BOE identifier |
| `extract_citations` | Extract all citations from text |

Supported formats: BOE-A-YYYY-NNNNN, ECLI:ES:TS:YYYY:N, Ley 39/2015, Real Decreto 123/2025, STS 123/2025, etc.

---

## legal-persona-esp

LLM-backed utility server.

| Tool | Description |
|------|-------------|
| `draft_documento` | Draft Spanish legal documents (demanda, escrito, contrato, recurso, informe, poder, memorial, providencia, minuta, carta, consulta) |
| `analizar_caso` | Analyze case with applicable law and jurisprudence |
| `estrategia_procesal` | Develop procedural strategy |
| `redactar_informe` | Generate legal opinion (informe jurídico) |
| `responder_consulta` | Answer general Spanish legal queries |

---

## doctrina-academica

Sources: INDRET (UPF), Dialnet, IURIS Digital

| Tool | Description |
|------|-------------|
| `search_doctrina` | Search academic articles |
| `search_by_autor` | Search by author name |

---

## derecho-historico

Sources: Gazeta Histórica (BOE/CEPC), Legislación Histórica de España (CEPC)

| Tool | Description |
|------|-------------|
| `search_gazeta_historica` | Search historical gazette (1661–1959) |
| `search_legislacion_historica` | Search historical legislation (10th c.–Isabel II) |
| `get_texto_historico` | Retrieve historical text by identifier |

---

## catalunya-legal

Source: Projecte Norma Civil (Universitat de Girona)

| Tool | Description |
|------|-------------|
| `search_norma_civil_cat` | Search Catalan civil legislation |
| `compare_catalan_spanish_civil` | Compare Catalan vs Spanish civil law |
| `get_articulo_civil_cat` | Retrieve specific Catalan civil article |

---

## busqueda-general

Sources: Portico Legal, Findiur

| Tool | Description |
|------|-------------|
| `search_portico` | Search Portico Legal |
| `search_findiur` | Search Findiur (AI-powered) |
| `search_multi_source` | Search across both sources |
