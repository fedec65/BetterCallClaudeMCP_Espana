import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';
import type {
  AgentManifestEntry,
  Pipeline,
  PipelineStep,
  WorkflowRow,
} from './types.js';
import { AGENTS_MANIFEST } from './types.js';
import { validatePipeline } from './validate.js';
import { WorkflowQuotaError, WorkflowValidationError } from './errors.js';
import type {
  ClaimUserIdResult,
  DeleteWorkflowResult,
  ListWorkflowsOptions,
  LogRunInput,
  LogRunResult,
  SaveWorkflowInput,
  SaveWorkflowResult,
  WorkflowStore,
} from './store.js';

/** Per-user cap on non-archived workflows (ADR §5(a)). */
const ACTIVE_QUOTA = 50;

/**
 * SQLite dialect of the ADR 0001 schema. Dev-only provider: ADR §2 rejects
 * SQLite for production ("breaks multi-instance aggregator"), so this store is
 * only selected explicitly via `WORKFLOWS_STORE=sqlite`. Array/JSONB columns
 * are stored as TEXT (JSON) and timestamps as ISO-8601 TEXT; UUIDs are
 * generated in-process with `crypto.randomUUID()`.
 */
export const SQLITE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agents_manifest (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id        TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    input_types     TEXT NOT NULL,
    output_types    TEXT NOT NULL,
    mcp_servers     TEXT NOT NULL,
    is_terminal     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workflows (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    slug            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    pipeline        TEXT NOT NULL,
    output_spec     TEXT NOT NULL,
    visibility      TEXT NOT NULL DEFAULT 'private'
                        CHECK (visibility IN ('private','team','public')),
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('draft','active','archived')),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
    id              TEXT PRIMARY KEY,
    workflow_id     TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    started_at      TEXT NOT NULL,
    completed_at    TEXT,
    status          TEXT CHECK (status IN ('running','completed','failed','abandoned')),
    output_summary  TEXT
);

CREATE TABLE IF NOT EXISTS claimed_ids (
    user_id         TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL
);
`;

interface SqliteWorkflowRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  pipeline: string;
  output_spec: string;
  visibility: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function parseArray(v: string): string[] {
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapRow(row: SqliteWorkflowRow): WorkflowRow {
  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    pipeline: JSON.parse(row.pipeline) as PipelineStep[],
    output_spec: row.output_spec,
    visibility: row.visibility as WorkflowRow['visibility'],
    status: row.status as WorkflowRow['status'],
    version: row.version,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * SQLite-backed implementation of `WorkflowStore` (dev-only, see ADR §2).
 *
 * The `better-sqlite3` driver is resolved lazily by `openSqliteWorkflowStore`
 * so that importing this module never fails on hosts where the native module
 * is unavailable — the error only surfaces when the sqlite provider is
 * actually requested via `WORKFLOWS_STORE=sqlite`.
 */
export class SqliteWorkflowStore implements WorkflowStore {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    db.exec(SQLITE_SCHEMA_SQL);
    this.seedManifest();
  }

  private seedManifest(): void {
    const upsert = this.db.prepare(
      `INSERT INTO agents_manifest (agent_id, display_name, input_types, output_types, mcp_servers, is_terminal)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (agent_id) DO UPDATE SET
         display_name = excluded.display_name,
         input_types  = excluded.input_types,
         output_types = excluded.output_types,
         mcp_servers  = excluded.mcp_servers,
         is_terminal  = excluded.is_terminal`,
    );
    const seed = this.db.transaction(() => {
      for (const agent of AGENTS_MANIFEST) {
        upsert.run(
          agent.agent_id,
          agent.display_name,
          JSON.stringify(agent.input_types),
          JSON.stringify(agent.output_types),
          JSON.stringify(agent.mcp_servers),
          agent.is_terminal ? 1 : 0,
        );
      }
    });
    seed();
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  async claimUserId(user_id: string): Promise<ClaimUserIdResult> {
    const existing = this.db.prepare('SELECT user_id FROM claimed_ids WHERE user_id = ?').get(user_id);
    if (existing) return { claimed: false, user_id };
    this.db
      .prepare('INSERT INTO claimed_ids (user_id, created_at) VALUES (?, ?)')
      .run(user_id, this.nowIso());
    return { claimed: true, user_id };
  }

  async listAgents(): Promise<AgentManifestEntry[]> {
    const rows = this.db
      .prepare(
        'SELECT agent_id, display_name, input_types, output_types, mcp_servers, is_terminal FROM agents_manifest ORDER BY agent_id',
      )
      .all() as Array<{
      agent_id: string;
      display_name: string;
      input_types: string;
      output_types: string;
      mcp_servers: string;
      is_terminal: number;
    }>;
    return rows.map((r) => ({
      agent_id: r.agent_id,
      display_name: r.display_name,
      input_types: parseArray(r.input_types),
      output_types: parseArray(r.output_types),
      mcp_servers: parseArray(r.mcp_servers),
      is_terminal: r.is_terminal === 1,
    }));
  }

  async validatePipeline(
    pipeline: PipelineStep[],
  ): Promise<{ valid: boolean; errors: Array<{ code: string; step?: number; message: string }> }> {
    return validatePipeline(pipeline as Pipeline);
  }

  async saveWorkflow(input: SaveWorkflowInput): Promise<SaveWorkflowResult> {
    const validation = validatePipeline(input.pipeline as Pipeline);
    if (!validation.valid) throw new WorkflowValidationError(validation.errors);

    const now = this.nowIso();
    const pipelineJson = JSON.stringify(input.pipeline);
    const visibility = input.visibility ?? 'private';

    const existing = this.db
      .prepare('SELECT * FROM workflows WHERE user_id = ? AND slug = ?')
      .get(input.user_id, input.slug) as SqliteWorkflowRow | undefined;

    if (existing) {
      const res = this.db
        .prepare(
          `UPDATE workflows SET name = ?, description = ?, pipeline = ?, output_spec = ?,
             visibility = ?, status = 'active', version = version + 1, updated_at = ?
           WHERE user_id = ? AND slug = ? RETURNING *`,
        )
        .get(
          input.name,
          input.description,
          pipelineJson,
          input.output_spec,
          visibility,
          now,
          input.user_id,
          input.slug,
        ) as SqliteWorkflowRow;
      return { saved: true, workflow: mapRow(res) };
    }

    const quota = this.db
      .prepare(
        "SELECT count(*) AS n FROM workflows WHERE user_id = ? AND status <> 'archived'",
      )
      .get(input.user_id) as { n: number };
    if (quota.n >= ACTIVE_QUOTA) throw new WorkflowQuotaError(ACTIVE_QUOTA, quota.n);

    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO workflows (id, user_id, slug, name, description, pipeline, output_spec, visibility, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.user_id,
        input.slug,
        input.name,
        input.description,
        pipelineJson,
        input.output_spec,
        visibility,
        now,
        now,
      );
    const row = this.db
      .prepare('SELECT * FROM workflows WHERE id = ?')
      .get(id) as SqliteWorkflowRow;
    return { saved: true, workflow: mapRow(row) };
  }

  async listWorkflows(options: ListWorkflowsOptions): Promise<WorkflowRow[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM workflows
         WHERE user_id = ?
            OR (? = 1 AND visibility = 'team')
            OR (? = 1 AND visibility = 'public')
         ORDER BY updated_at DESC`,
      )
      .all(
        options.user_id,
        options.include_team === true ? 1 : 0,
        options.include_public === true ? 1 : 0,
      ) as SqliteWorkflowRow[];
    return rows.map(mapRow);
  }

  async getWorkflow(user_id: string, slug: string): Promise<WorkflowRow | null> {
    const own = this.db
      .prepare('SELECT * FROM workflows WHERE user_id = ? AND slug = ?')
      .get(user_id, slug) as SqliteWorkflowRow | undefined;
    if (own) return mapRow(own);
    const pub = this.db
      .prepare("SELECT * FROM workflows WHERE slug = ? AND visibility = 'public' ORDER BY updated_at DESC LIMIT 1")
      .get(slug) as SqliteWorkflowRow | undefined;
    return pub ? mapRow(pub) : null;
  }

  async deleteWorkflow(user_id: string, slug: string): Promise<DeleteWorkflowResult> {
    // workflow_runs rows cascade via the ON DELETE CASCADE FK.
    const res = this.db
      .prepare('DELETE FROM workflows WHERE user_id = ? AND slug = ?')
      .run(user_id, slug);
    return { deleted: res.changes > 0 };
  }

  async logRun(input: LogRunInput): Promise<LogRunResult> {
    const now = this.nowIso();

    if (input.status === 'running') {
      const id = randomUUID();
      this.db
        .prepare(
          `INSERT INTO workflow_runs (id, workflow_id, user_id, started_at, status) VALUES (?, ?, ?, ?, 'running')`,
        )
        .run(id, input.workflow_id, input.user_id, now);
      return { run_id: id };
    }

    const open = this.db
      .prepare(
        `SELECT id FROM workflow_runs
         WHERE workflow_id = ? AND user_id = ? AND status = 'running' AND completed_at IS NULL
         LIMIT 1`,
      )
      .get(input.workflow_id, input.user_id) as { id: string } | undefined;

    if (open) {
      this.db
        .prepare(
          `UPDATE workflow_runs SET status = ?, completed_at = ?, output_summary = COALESCE(?, output_summary) WHERE id = ?`,
        )
        .run(input.status, now, input.output_summary ?? null, open.id);
      return { run_id: open.id };
    }

    const id = randomUUID();
    const workflowExists = this.db
      .prepare('SELECT id FROM workflows WHERE id = ?')
      .get(input.workflow_id);
    if (!workflowExists) {
      throw new Error(`workflow ${input.workflow_id} does not exist (log_run)`);
    }
    this.db
      .prepare(
        `INSERT INTO workflow_runs (id, workflow_id, user_id, started_at, completed_at, status, output_summary)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.workflow_id,
        input.user_id,
        now,
        now,
        input.status,
        input.output_summary ?? null,
      );
    return { run_id: id };
  }

  async deleteUser(user_id: string): Promise<{ deleted: boolean; workflows_cascade: number; runs_abandoned: number }> {
    const tx = this.db.transaction(() => {
      const abandoned = this.db
        .prepare(
          `UPDATE workflow_runs SET status = 'abandoned', completed_at = COALESCE(completed_at, ?)
           WHERE user_id = ? AND status = 'running'`,
        )
        .run(this.nowIso(), user_id);
      const cascaded = this.db
        .prepare('DELETE FROM workflows WHERE user_id = ?')
        .run(user_id);
      const claimed = this.db
        .prepare('DELETE FROM claimed_ids WHERE user_id = ?')
        .run(user_id);
      return { abandoned: abandoned.changes, cascaded: cascaded.changes, claimed: claimed.changes };
    });
    const { abandoned, cascaded, claimed } = tx();
    return {
      deleted: cascaded > 0 || abandoned > 0 || claimed > 0,
      workflows_cascade: cascaded,
      runs_abandoned: abandoned,
    };
  }
}

/**
 * Constructor shape of the native `better-sqlite3` driver, kept as an explicit
 * interface so the module can be imported lazily (type-only import above) and
 * only resolved at runtime when the sqlite provider is requested.
 */
interface SqliteDatabaseConstructor {
  new (filePath: string): Database;
}

/**
 * Open a SQLite-backed store, resolving the native `better-sqlite3` driver
 * lazily so this dependency only matters when the sqlite provider is used.
 */
export async function openSqliteWorkflowStore(filePath: string): Promise<SqliteWorkflowStore> {
  let DatabaseCtor: SqliteDatabaseConstructor;
  try {
    ({ default: DatabaseCtor } = await import('better-sqlite3'));
  } catch (err) {
    throw new Error(
      `WORKFLOWS_STORE=sqlite requires the "better-sqlite3" dependency, which could not be loaded: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  const db = new DatabaseCtor(filePath);
  return new SqliteWorkflowStore(db);
}
