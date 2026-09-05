/**
 * SCHEMA_SQL — verbatim from ADR 0001 §"Schema Postgres".
 *
 * Notes:
 * - `gen_random_uuid()` requires `pgcrypto` (or PG ≥ 13). Verify on the
 *   managed Postgres target (Railway ships it).
 * - Schema is created idempotently on cold start (`ensureSchema()` in
 *   `store-postgres.ts`); there is no separate migration runner.
 * - Retention: ADR §4(a) adds a nightly sweep on `workflow_runs` for rows
 *   older than 90 days; the cron job is OUT OF SCOPE for this scaffold
 *   (deployed in t34 / #35).
 */
export const SCHEMA_SQL = `
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
`;
