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

---

## workflows-esp

Persistent workflow orchestration store backing the plugin `/create-workflow` command and agent-chain FLUJOS. Schema follows ADR 0001 (`agents_manifest`, `workflows`, `workflow_runs`, `claimed_ids`); see `mcp-servers/workflows/migrations/0001_init.sql` for the canonical DDL.

Storage provider is selected by env at process start (`WORKFLOWS_STORE` = `memory` | `sqlite` | `postgres`; defaults to `postgres` when `DATABASE_URL` is set, otherwise `memory`). Production runs on Postgres (Railway); SQLite is the dev-only local provider.

| Tool | Description |
|------|-------------|
| `claim_user_id` | Reserve a `user_id` in `claimed_ids` (idempotent — `claimed: false` if already taken). Client resolves `user_id` via a 4-fallback chain before calling this. |
| `list_agents` | Return the chainable plugin agents (from `agents_manifest`). Drives the `/create-workflow` interview. |
| `validate_pipeline` | Stateless pipeline check against the agent manifest → `{valid, errors[]}`. Does not persist. |
| `save_workflow` | Upsert a workflow keyed by `(user_id, slug)`. Server-side re-validation; 50-active quota per user; bumps `version` on update. |
| `list_workflows` | List workflows visible to the caller (own + optional `team`/`public`). |
| `get_workflow` | Fetch one workflow by slug (owner-or-visible check). |
| `delete_workflow` | Delete one of the caller's own workflows (owner-only). |
| `log_run` | Append an audit row to `workflow_runs`; `completed_at` is set automatically unless `status="running"`. |
| `delete_user` | LOPDGDD §17 cascade delete: user, their workflows, their `claimed_id`; pre-existing runs are marked `abandoned` for audit. |
