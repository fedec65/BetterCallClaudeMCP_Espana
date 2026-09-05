# workflows-esp — Persistent Workflow Store

Backing server for the BetterCallClaude España **FLUJOS** (agent-chain workflows). It
persists multi-agent pipelines and their runs so a workflow survives Claude Cowork
session restarts — the sandbox home is wiped on restart, but the workflow state lives
in this server plus the local `bcc-output/workflow/<user_id>/<slug>/` output directory.

Design decision record: [`docs/adr/0001-workflows-esp-design.md`](adr/0001-workflows-esp-design.md).
Package: `mcp-servers/workflows/` (`@bettercallclaude/esp-workflows`), parity with the
CH `workflows-ch` / IT `workflows-ita` servers.

## Architecture

```
plugin (Claude Code CLI / Cowork Desktop)
   │  MCP stdio or HTTP (deployment: POST /workflows-esp/mcp)
   ▼
workflows-esp  (mcp-servers/workflows)
   ├── server.ts        — MCP tool descriptors + dispatch (9 tools)
   ├── tools.ts         — zod input schemas + per-tool handlers
   ├── validate.ts      — stateless pipeline validator (chaining rule)
   ├── types.ts         — zod schemas + AGENTS_MANIFEST (21 plugin agents)
   ├── store.ts         — WorkflowStore interface
   ├── store-factory.ts — provider selection from env
   ├── store-memory.ts  — in-memory (fallback / tests)
   ├── store-sqlite.ts  — SQLite via better-sqlite3 (dev)
   ├── store-postgres.ts— Postgres (production)
   └── sql.ts           — SCHEMA_SQL (canonical DDL copy)
```

Entry points (after `npm run build` → `dist/`):

- `dist/index.js` — MCP `Server` (SDK) without transport wiring; imported by tests.
- `dist/stdio.js` — stdio transport; the row used by Claude Code CLI / Cowork Desktop
  local config (`npx tsx mcp-servers/workflows/src/stdio.ts` in dev, see
  `docs/08-CLIENT-CONFIGURATIONS.md`).
- In production the server is exposed over HTTP by the deployment aggregator as
  `POST /workflows-esp/mcp` (`GET /health` reports it among the 13 servers).

### Store provider resolution (`store-factory.ts`)

1. `WORKFLOWS_STORE` env if set to `memory` | `sqlite` | `postgres`;
2. else `postgres` when `DATABASE_URL` is set;
3. else `memory` (data is **not** persistent — used for tests/fallback).

| Env | Default | Meaning |
|-----|---------|---------|
| `WORKFLOWS_STORE` | — | provider: `memory` \| `sqlite` \| `postgres` |
| `DATABASE_URL` | — | Postgres connection string (production) |
| `WORKFLOWS_SQLITE_PATH` | `workflows-esp.sqlite` | SQLite file path (dev-only provider) |

ADR §2 rejects SQLite in production: production runs Postgres (Railway).

## Database schema

Four tables, DDL in `mcp-servers/workflows/migrations/0001_init.sql` (ops copy; a unit
test asserts it stays identical to `SCHEMA_SQL` in `src/sql.ts`, whitespace-insensitive).
Postgres store applies it idempotently at startup (`CREATE TABLE IF NOT EXISTS`).

| Table | Key | Notes |
|-------|-----|-------|
| `agents_manifest` | `agent_id` UNIQUE | Seed of the 21 chainable ESP plugin agents (see below). |
| `workflows` | `id` UUID | `(user_id, slug)` UNIQUE; pipeline `JSONB`; `visibility` `private\|team\|public`; `status` `draft\|active\|archived`; `version` bumped on update. |
| `workflow_runs` | `id` UUID | FK `workflow_id` → `workflows(id)` ON DELETE CASCADE; `status` `running\|completed\|failed\|abandoned`. |
| `claimed_ids` | `user_id` PK | user_id reservation; charset `^[A-Za-z0-9._@-]+$` 1–128 (ADR §3(c)). |

Audit semantics: `log_run` appends rows to `workflow_runs`; `completed_at` is set
automatically unless `status="running"`. `delete_user` (LOPDGDD §17) cascades the
user's workflows + claimed_id and marks their pre-existing runs `abandoned` for audit.

## Agent manifest & chaining rule

`AGENTS_MANIFEST` (`src/types.ts`) is curated from the plugin agents
(`bettercallclaude-espana/agents/*.md`, 21 agents): `agent_id` = frontmatter `name:`,
`input_types`/`output_types` are a controlled chaining vocabulary, `mcp_servers` are the
deduplicated `mcp__*__` tools referenced by the agent, `is_terminal` is true only for
`spanish-summarizer`.

`validatePipeline` (`src/validate.ts`) checks, in order:

1. **Sequential** — `step` must equal its 1-based index (1, 2, 3, …).
2. **Known agents** — every `agent_id` is in the manifest.
3. **Chaining overlap** — `output_types` of step N must **intersect** `input_types` of
   step N+1 (non-empty intersection). Two agents chain when the first's outputs overlap
   the second's inputs.

Because the rule is an intersection, `verified_citations` (the only output of
`spanish-citation-expert`) is accepted only by `spanish-summarizer` — no mid-chain agent
consumes it. The example `flusso-nda` pipeline therefore uses 4 stages where
`spanish-legal-researcher` emits both `research_findings` and `citations` (see below).

## Tool surface (9)

| Tool | Purpose |
|------|---------|
| `claim_user_id` | Reserve a `user_id` in `claimed_ids` (idempotent — `claimed: false` if already taken). |
| `list_agents` | Return the chainable plugin agents; drives the `/create-workflow` interview. |
| `validate_pipeline` | Stateless pipeline check → `{valid, errors[]}`. Does not persist. |
| `save_workflow` | Upsert workflow keyed by `(user_id, slug)`; server-side re-validation; 50-active quota per user; bumps `version`. |
| `list_workflows` | List workflows visible to the caller (own + optional `team`/`public`). |
| `get_workflow` | Fetch one workflow by slug (owner-or-visible check). |
| `delete_workflow` | Delete one of the caller's own workflows (owner-only). |
| `log_run` | Append an audit row to `workflow_runs`. |
| `delete_user` | LOPDGDD §17 cascade delete (user + workflows + claimed_id; runs → `abandoned`). |

Input schemas are validated with zod; errors are returned as MCP `isError` envelopes
(`zodErrorEnvelope`, `WorkflowQuotaError` → `quota_exceeded`, etc.).

## user_id resolution

Every tool requires a `user_id`. The plugin resolves it via a 4-fallback chain before
calling the server (plugin setting → Cowork custom instructions → `~/.betterask/config.yaml`
→ generated `bcc-<8 hex bytes>` and claimed via `claim_user_id`). The claim is
idempotent: the same `user_id` re-claimed in a new session returns `claimed: false` but
stays valid, which is what lets workflows survive session restarts.

## Example: `flusso-nda` (NDA review chain)

The reference workflow (used by the plugin E2E test) reviews a non-disclosure agreement:
analyzes it, identifies risky clauses, cites applicable law, drafts clause comments and
annotates LOPDGDD risk.

```json
{
  "user_id": "bcc-0123456789abcdef",
  "slug": "flusso-nda",
  "name": "Análisis de NDA",
  "pipeline": [
    { "step": 1, "agent_id": "spanish-briefing-coordinator", "purpose": "Ensamblar el brief del NDA" },
    { "step": 2, "agent_id": "spanish-legal-researcher", "purpose": "Investigar el marco legal y localizar citas", "checkpoint": true },
    { "step": 3, "agent_id": "spanish-legal-drafter", "purpose": "Borrador de cláusulas y comentarios", "checkpoint": true },
    { "step": 4, "agent_id": "spanish-data-protection-expert", "purpose": "Anotación de riesgo LOPDGDD" }
  ],
  "output_spec": "bcc-output/workflow/<user_id>/flusso-nda/<run-id>/{intake.md,analysis.md,citations.md,borrador.md}"
}
```

Outputs per stage (written to `bcc-output/workflow/<user_id>/flusso-nda/<run-id>/`):

| Stage | Agent | File |
|-------|-------|------|
| 1 | briefing coordinator | `intake.md` |
| 2 | legal researcher | `analysis.md` + `citations.md` |
| 3 | legal drafter | `borrador.md` |
| 4 | data-protection expert | LOPDGDD annotations to `borrador.md` |

`progress.json` in the same run directory is the resume source of truth: a stage marked
`completed` **and** whose output file exists is skipped on `--resume`; anything else
re-runs from that point onward, and the run closes with a `log_run` `completed` row.

### Running the E2E locally (dev, SQLite)

```bash
# in the MCP repo — build the workflows server
npm --prefix mcp-servers/workflows run build   # or npm run build at repo root

# in the plugin repo — acceptance test (spawns the server over stdio in sqlite mode)
MCP_ESP_ROOT=/path/to/BetterCallClaudeMCP_Espana \
  node scripts/test-flusso-nda-e2e.mjs
```

The script proves: `claim_user_id` idempotency across restarts, `save_workflow`
persistence across subprocess kill/relaunch (simulated Cowork restart), the
filesystem-resume invariant, and the audit `log_run` close.

## Development

```bash
npm --prefix mcp-servers/workflows run typecheck   # tsc --noEmit
npm --prefix mcp-servers/workflows test            # vitest (manifest/validate, CRUD, sqlite, postgres, http)
npm --prefix mcp-servers/workflows run build       # tsc → dist/
```

Tests cover the validator, workflow CRUD across providers, the SQLite provider
(optional `better-sqlite3`), Postgres integration (skipped without `DATABASE_URL`), and
the HTTP transport.

See also: [`docs/07-MCP-SERVERS-REFERENCE.md`](07-MCP-SERVERS-REFERENCE.md) (tool surface
overview) and [`docs/08-CLIENT-CONFIGURATIONS.md`](08-CLIENT-CONFIGURATIONS.md) (client
rows + full env reference).
