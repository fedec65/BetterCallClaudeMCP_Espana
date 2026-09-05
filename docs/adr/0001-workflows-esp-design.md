# ADR 0001 — workflows-esp MCP server design

- **Status:** Accepted
- **Date:** 2026-09-05
- **Deciders:** fedec65 (Wayfinder Map D, ticket t31 / #31)
- **Upstream reference:** [research/workflows-ch.md](https://github.com/fedec65/bettercallclaude-espana/blob/research/workflows-ch/.wayfinder/d-map/research/workflows-ch.md) (ticket t30 / #36)
- **Related issue:** https://github.com/fedec65/bettercallclaude-espana/issues/31

## Context

`bettercallclaude-espana` deve raggiungere parità con i plugin svizzero (`fedec65/bettercallclaude`) e italiano (`fedec65/bettercallclaude_italia`) per la parte **flussi persistenti** (`/create-workflow`, `/workflow`). Questi sopravvivono alla sessione Cowork grazie a un server MCP `workflows-ch` (CH) / `workflows-ita` (IT) che persiste workflow in Postgres e li recapita al plugin via `user_id` claimable.

Il plugin ESP attualmente **non ha** né i comandi né il server MCP. Il repo MCP ESP (`fedec65/BetterCallClaudeMCP_Espana`) ha 11 server remoti + aggregatore HTTP, ma nessun workspace `workflows`.

L'ADR codifica le 8 decisioni di design di Map D t31 / #31, dopo il research di Map D t30 / #36 che ha ispezionato `workflows-ch`.

## Decisioni

### 1. Tenancy → **Port all'italiana** (nuovo workspace dedicato ESP)

- **Cosa**: aggiungere `mcp-servers/workflows/` come nuovo workspace in `fedec65/BetterCallClaudeMCP_Espana`, esposto come `/workflows-esp/mcp` nell'aggregator HTTP già esistente.
- **Workspace name**: `mcp-servers/workflows/`. **NPM name**: `@bettercallclaude/esp-workflows`. **Server name** (in `.mcp.json` plugin e nell'array `servers` aggregator): `workflows-esp`.
- **Motivazione**: parità con IT (`workflows-ita`) e CH (`workflows-ch`); data residency LOPDGDD (dati utente in Postgres gestito dalla nostra infra ESP); manifest agent curato per i 21 agent del plugin ESP (vs 16 CH).
- **Rifiutate**: B (tenancy condivisa su backend CH) per lock-step e assenza data residency; C (fork monorepo CH separato) per doppio upkeep CI/Railway.

### 2. Storage → **Railway Postgres** (stessa infra aggregator)

- `DATABASE_URL` env var. Pool `pg` con `max: 5`. SSL `{ rejectUnauthorized: false }` per Postgres managed, auto-disabilitato su localhost / sslmode esplicito.
- **Motivazione**: deploy Railway già esistente per l'aggregator → zero rete interna, backup integrati, monitoring unificato, rispetto AGPL §13 di default.
- **Rifiutate**: Supabase (latenza cross-network), Neon (cold start rompe il pool `pg`), SQLite (rompe multi-instance aggregator).

### 3. `user_id` schema → **claim_once + plain + replica regex CH**

- (a) **claim_once**: `claim_user_id` viene chiamato una sola volta al primo uso; sessioni successive non ri-claimevano. La catena 4-fallback (plugin setting → Cowork instructions → `~/.betterask/config.yaml` → generate `bcc-<hex>`) vive nel markdown dei comandi plugin.
- (b) **Plain in Postgres**: nessuna cifratura a livello colonna. Il workflow è IP dell'utente (descrizioni processi legali) ma non PII LOPDGDD-sensibile. Sicurezza = protezione Railway ACL + backup cifrati a livello volume.
- (c) **Regex replica CH**: `^[A-Za-z0-9._@-]+$`, 1–128 chars.
- **Rifiutate**: claim_each_session (rompe Cowork wipe); cifratura colonna (complessità operativa, perde query su JSONB `pipeline`).

### 4. Retention policy

- **(a) `workflow_runs`**: TTL **90 giorni**. Sweep notturno via cron Railway o `pg_cron`: `DELETE FROM workflow_runs WHERE completed_at < now() - interval '90 days'`. Copre un ricorso tipico (plazo recurso ES = 2 mesi, 90gg = margine sicuro).
- **(b) `workflows`**: **nessuna TTL**, solo cancellazione esplicita via `delete_workflow`. Il workflow è un asset dell'utente, non log tecnico.
- **(c) Cancellazione account (LOPDGDD §17)**: tool `delete_user({user_id})` con cascade-delete di tutti i workflow + claimed_ids; le run pregresse vengono marcate `status='abandoned'` per audit.
- **Delta vs CH**: +1 tool (`delete_user`); +1 cron (sweep 90gg). **Annotato come scelta consapevole.**

### 5. Quota

- **(a) Workflow per `user_id`**: limite **50 workflow attivi** (`status='active'`). Check su `save_workflow`: `SELECT COUNT(*) FROM workflows WHERE user_id=$1 AND status='active'` prima di upsert. Errore `WorkflowQuotaError → {error:"quota_exceeded", limit:50, current:N}`.
- **(b) Iterazioni `legal-loop`**: **nessuna quota ora** (legal-loop arriverà in Map E — fuori scope Map D).
- **(c) Rate limit `save_workflow`**: **nessuno per ora**. `save_workflow` è chiamato una volta per interview completata; la quota (a) protegge da crescita patologica.
- **Delta vs CH**: +1 enforcement quota. **Annotato come scelta consapevole.**

### 6. Naming → **`workflows-esp`**

- Suffisso `-<locale>` come contratto (`workflows-ch`, `workflows-ita`, `workflows-esp`).
- **Refactor a `workflows` secco** valutato: rimandato a quando IT/CH avranno confermato l'allineamento.

### 7. Endpoint path → **`/workflows-esp/mcp`**

- Pattern auto-mount in `mcp-servers-http/src/app.ts`: `app.post(/<name>/mcp, handler)`. L'aggregator ESP è già polimorfico (array `servers` in `index.ts`) — aggiungere `workflows-esp` monta automaticamente la route.
- **Coerente** con tutti gli altri server ESP (`/boe-legislacion/mcp`, `/cendoj-jurisprudencia/mcp`, ecc.).

### 8. Bridge Cowork Desktop

- **(a) `.mcp.json` plugin**: entry `type: http` con `url: https://mcp.bettercallclaude.es/workflows-esp/mcp`. **Replica pattern esistente** (gli altri 11 server ESP sono già dichiarati così).
- **(b) Bridge stdio locale**: **non dichiarato** nel `.mcp.json`. Il bridge `mcp-bridge.ts` dell'MCP repo è già parametrico (`<server-name>` argv) e funziona nativamente per `workflows-esp` se mai servisse. Nessuna doppia entry per evitare conflitto nomi tool.
- **(c) Plugin setting `user_id`**: aggiungere `user_id` come **plugin setting opzionale** in `bettercallclaude-espana/.claude-plugin/plugin.json`. Allinea la catena 4-fallback (step 1 funziona); costo = 4 righe plugin.json + 1 sezione README.

## Schema Postgres (verbatim)

Idempotente su cold start (`ensureSchema()`). Memoized per processo.

```sql
CREATE TABLE IF NOT EXISTS agents_manifest (
    id              SERIAL PRIMARY KEY,
    agent_id        TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    input_types     TEXT[] NOT NULL,
    output_types    TEXT[] NOT NULL,
    mcp_servers     TEXT[] NOT NULL,
    is_terminal     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    slug            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    pipeline        JSONB NOT NULL,
    output_spec     TEXT NOT NULL,
    visibility      TEXT NOT NULL DEFAULT 'private'
                        CHECK (visibility IN ('private','team','public')),
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('draft','active','archived')),
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    started_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    status          TEXT CHECK (status IN ('running','completed','failed','abandoned')),
    output_summary  TEXT
);

CREATE TABLE IF NOT EXISTS claimed_ids (
    user_id         TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

**Nota**: la visibility `team` è leaky abstraction upstream (nessuna tabella membership) — accettata come delta, da rivedere in futuro.

## Tool surface finale (9 tool, +1 vs CH)

| # | Tool | Tipo | Annotation |
|---|---|---|---|
| 1 | `list_agents` | read | readOnlyHint |
| 2 | `validate_pipeline` | read | readOnlyHint |
| 3 | `save_workflow` | write | idempotent (upsert) |
| 4 | `list_workflows` | read | readOnlyHint |
| 5 | `get_workflow` | read | readOnlyHint |
| 6 | `delete_workflow` | write | destructiveHint: true |
| 7 | `claim_user_id` | write | idempotent (ON CONFLICT DO NOTHING) |
| 8 | `log_run` | write | audit |
| 9 | **`delete_user`** (delta ESP) | write | destructiveHint: true — cascade delete user + workflows + claimed_ids |

Tutti senza prefisso server-side; prefisso aggiunto dal client (`mcp__workflows-esp__*`).

## Error envelope (uniforme)

```json
// Success
{ "content": [{ "type": "text", "text": "<JSON.stringify(value, null, 2)>" }] }

// Zod input violation
{ "content": [{ "type": "text", "text": "{ \"error\": \"invalid_input\", \"issues\": [...] }" }], "isError": true }

// Pipeline validation failure (save_workflow / validate_pipeline)
{ "content": [{ "type": "text", "text": "{ \"valid\": false, \"errors\": [{ \"code\": \"...\", \"step\": N, \"message\": \"...\" }] }" }], "isError": true }

// Quota exceeded (delta ESP)
{ "content": [{ "type": "text", "text": "{ \"error\": \"quota_exceeded\", \"limit\": 50, \"current\": 50 }" }], "isError": true }

// Generic
{ "content": [{ "type": "text", "text": "{ \"error\": \"<message>\" }" }], "isError": true }
```

## Delta espliciti vs CH (consapevoli)

| Aspetto | CH | ESP | Motivazione |
|---|---|---|---|
| Numero tool | 8 | **9** (+`delete_user`) | LOPDGDD §17 diritto di cancellazione |
| Manifest agent | 16 CH | 21 ESP | Plugin ESP ha 21 agent chainable |
| Retention `workflow_runs` | nessuna | **90gg cron sweep** | Pulizia storage; copre plazo recurso ES |
| Quota workflow | nessuna | **50 attivi/user** | Protezione storage + abuse |
| Storage vendor | Railway (CH) | Railway (ESP, stesso account) | Coerenza deploy |
| Tenancy | dedicata CH | dedicata ESP | Parità con IT; data residency |
| Endpoint path | `/workflows-ch/mcp` | `/workflows-esp/mcp` | Suffisso -<locale> |
| Plugin setting `user_id` | presente | **aggiunto** (delta plugin-side, ADR docs) | Catena 4-fallback step 1 |

## Conseguenze

**Positive**:
- Parità tool-surface con IT (`workflows-ita`) e CH (`workflows-ch`): cross-plugin learning e tooling transfers.
- Data residency LOPDGDD rispettata di default.
- Deploy Railway unificato (aggregator + Postgres nello stesso account/progetto).
- Cron sweep + quota = storage bounded e prevedibile.

**Negative / accettate**:
- +1 tool (`delete_user`) = divergenza da CH per LOPDGDD — gestibile, non rompe il pattern.
- Plugin setting `user_id` è plugin-side change (non MCP-side) — richiede coordinamento con ticket plugin.
- Visibility `team` leaky abstraction accettata come debito tecnico — da rivedere post-Map D.

**Risk register**:
1. `gen_random_uuid()` richiede `pgcrypto` o PG ≥ 13 — verificare su Railway Postgres ESP.
2. Lo schema shared tra tutti i tenant senza RLS — considerare per Map E (LOPDGDD evoluto).
3. La catena 4-fallback vive nel markdown dei comandi plugin — qualsiasi divergenza tra i 3 plugin (CH/IT/ESP) crea incoerenza UX.

## File toccati da Map D (post-ADR)

- **MCP repo ESP**: `mcp-servers/workflows/{package.json,tsconfig.json,src/{index,server,types,validate,manifest,sql,db,tools}.ts}` + 2 righe in `mcp-servers-http/src/index.ts`.
- **MCP repo ESP — deploy**: env `DATABASE_URL` su Railway; cron job per sweep 90gg.
- **Plugin ESP**: nuovo entry `workflows-esp` in `.mcp.json`; 3 comandi nuovi (`crear-workflow`, `workflow`, eventualmente `flusso-nda`); plugin setting `user_id` in `.claude-plugin/plugin.json`.

## Se cambiano i vincoli

| Se... | Allora... |
|---|---|
| Vendor Railway cambia | Rivalutare ADR 0001 §2 — Redis/Supabase riapre il capitolo storage |
| LOPDGDD richiede cifratura at-rest per descrizioni processi | ADR 0001 §3(b) E1 → E2; aggiungere `pgcrypto` + key rotation |
| Quota 50 risulta stretta | Bumpare in ADR 0001 §5(a); una migrazione dati non serve (è solo count check) |
| `legal-loop` arriva in Map E | Aggiungere §5(b) con quota iterazioni per goal |
| Manifest agent cresce oltre 21 | Aggiornare `src/manifest.ts` + seed `agents_manifest` via `ensureSchema` |
| Visibility `team` diventa requirement | Aggiungere tabella `team_members` + `WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id=$1)` |
| Tenancy condivisa con CH torna desiderabile | ADR 0001 §1 A → B; deprecare questo workspace, puntare plugin a `/workflows-ch/mcp` con prefisso `user_id='esp:'` |
