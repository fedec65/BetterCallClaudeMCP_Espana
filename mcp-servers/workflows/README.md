# @bettercallclaude/esp-workflows

Persistent workflow storage MCP server for the **BetterCallClaude España** plugin. Provides parity with the Swiss `workflows-ch` and Italian `workflows-ita` servers — see [ADR 0001](https://github.com/fedec65/BetterCallClaudeMCP_Espana/blob/feat/workflows-esp-adr/docs/adr/0001-workflows-esp-design.md) for the full design.

## Status

**Scaffold (t33 / Map D #33)**. Only `claim_user_id` is fully implemented as a reference; `list_agents` reads from the static `AGENTS_MANIFEST`; `validate_pipeline` is a pure stateless function. The remaining 6 tools (`save_workflow`, `list_workflows`, `get_workflow`, `delete_workflow`, `log_run`, `delete_user`) throw `ToolNotImplementedError` and will be implemented in follow-up tickets (t34 #35 integration).

## Tool surface (9 tool — 8 CH parity + 1 ESP delta)

| # | Tool | Status in this scaffold |
|---|---|---|
| 1 | `claim_user_id` | ✅ implemented (InMemory + Postgres stub) |
| 2 | `list_agents` | ✅ implemented (static `AGENTS_MANIFEST`) |
| 3 | `validate_pipeline` | ✅ implemented (pure function) |
| 4 | `save_workflow` | 🟡 skeleton — throws `ToolNotImplementedError` |
| 5 | `list_workflows` | 🟡 skeleton — throws `ToolNotImplementedError` |
| 6 | `get_workflow` | 🟡 skeleton — throws `ToolNotImplementedError` |
| 7 | `delete_workflow` | 🟡 skeleton — throws `ToolNotImplementedError` |
| 8 | `log_run` | 🟡 skeleton — throws `ToolNotImplementedError` |
| 9 | `delete_user` (ESP delta, LOPDGDD §17) | 🟡 skeleton — throws `ToolNotImplementedError` |

## Architecture

```
src/
├── index.ts              # barrel
├── server.ts             # createWorkflowsServer({ store }) factory
├── types.ts              # zod schemas (UserId, Slug, PipelineStep, Visibility, tool inputs)
├── validate.ts           # validatePipeline() + ValidationError codes
├── manifest.ts           # AGENTS_MANIFEST seed (21 ESP agents — TODO curate from plugin agents/*.md)
├── sql.ts                # SCHEMA_SQL (verbatim ADR §"Schema Postgres")
├── store.ts              # WorkflowStore interface
├── store-postgres.ts     # PostgresWorkflowStore (skeleton: connection + ensureSchema + claim_user_id)
├── store-memory.ts       # InMemoryWorkflowStore (for tests: claim_user_id + list_agents + validate_pipeline only)
├── tools.ts              # 9 tool functions
└── errors.ts             # ToolNotImplementedError + envelope helpers
```

The factory is **stateless**: `createWorkflowsServer({ store })` takes a `WorkflowStore` implementation as an argument. Tests use `InMemoryWorkflowStore`; production uses `PostgresWorkflowStore` (instantiated by the aggregator with `DATABASE_URL`).

## Testing locally

```bash
npm test                      # runs vitest (unit + integration)
npm run typecheck             # tsc --noEmit
```

## Wiring into the HTTP aggregator

Add to `mcp-servers-http/src/index.ts`:

```ts
import { createWorkflowsServer, PostgresWorkflowStore } from '@bettercallclaude/esp-workflows';

// in main():
const workflowsStore = new PostgresWorkflowStore();
await workflowsStore.init();

const servers = [
  // ... existing 11 servers ...
  { name: 'workflows-esp', createServer: () => createWorkflowsServer({ store: workflowsStore }) },
];
```

Then `POST /workflows-esp/mcp` and `GET /workflows-esp/mcp` are auto-mounted by `app.ts`.

## Required environment variables

| Var | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | production (Postgres) | Format `postgres://user:pass@host:port/db`. Pool `max:5`, SSL `{ rejectUnauthorized:false }` for managed Postgres (auto-disabled on localhost or explicit sslmode). |

## License

AGPL-3.0-or-later.
