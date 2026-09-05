import { Pool, type PoolClient } from 'pg';
import type {
  AgentManifestEntry,
  Pipeline,
  PipelineStep,
  WorkflowRow,
} from './types.js';
import { AGENTS_MANIFEST } from './types.js';
import { validatePipeline } from './validate.js';
import { WorkflowQuotaError, WorkflowValidationError } from './errors.js';
import { SCHEMA_SQL } from './sql.js';
import { logger } from '@bettercallclaude/esp-shared';
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

interface PostgresOptions {
  connectionString?: string; // defaults to process.env.DATABASE_URL
  poolMax?: number; // default 5
  ssl?: { rejectUnauthorized: boolean } | false; // auto by default
}

/** Per-user cap on non-archived workflows (ADR §5(a)). */
const ACTIVE_QUOTA = 50;

interface WorkflowRowSql {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  pipeline: unknown;
  output_spec: string;
  visibility: string;
  status: string;
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
}

function iso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function mapWorkflowRow(row: WorkflowRowSql): WorkflowRow {
  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    pipeline: row.pipeline as PipelineStep[],
    output_spec: row.output_spec,
    visibility: row.visibility as WorkflowRow['visibility'],
    status: row.status as WorkflowRow['status'],
    version: row.version,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

/**
 * Postgres-backed implementation of `WorkflowStore`.
 *
 * **Scope of t34 / #35 integration** (extends the t33 scaffold):
 * - `init()` runs `SCHEMA_SQL` idempotently (memoized per process) and seeds
 *   `AGENTS_MANIFEST` with `ON CONFLICT (agent_id) DO UPDATE`.
 * - All nine store methods are implemented (see ADR 0001).
 *
 * SSL behavior (per ADR §2):
 *   - For managed Postgres (Railway): `{ rejectUnauthorized: false }`.
 *   - For localhost / 127.0.0.1 / [::1] / explicit `sslmode=`: SSL disabled.
 *
 * The store is a **process singleton**: the HTTP aggregator creates one MCP
 * `Server` per session, so the pool must not be created per session.
 */
export class PostgresWorkflowStore implements WorkflowStore {
  private readonly pool: Pool;
  private initPromise: Promise<void> | null = null;

  constructor(opts: PostgresOptions = {}) {
    const connectionString = opts.connectionString ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set; cannot construct PostgresWorkflowStore');
    }

    const isLocal =
      /localhost|127\.0\.0\.1|\[::1\]|sslmode=/i.test(connectionString);
    const ssl = opts.ssl !== undefined ? opts.ssl : isLocal ? false : { rejectUnauthorized: false };

    this.pool = new Pool({
      connectionString,
      max: opts.poolMax ?? 5,
      ssl,
    });
  }

  /**
   * Idempotent schema + manifest seed. Memoized per process.
   * Errors reset the memoization so the next request can retry.
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const client = await this.pool.connect();
      try {
        await client.query(SCHEMA_SQL);
        for (const agent of AGENTS_MANIFEST) {
          await client.query(
            `INSERT INTO agents_manifest (agent_id, display_name, input_types, output_types, mcp_servers, is_terminal)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (agent_id) DO UPDATE SET
               display_name = EXCLUDED.display_name,
               input_types  = EXCLUDED.input_types,
               output_types = EXCLUDED.output_types,
               mcp_servers  = EXCLUDED.mcp_servers,
               is_terminal  = EXCLUDED.is_terminal`,
            [
              agent.agent_id,
              agent.display_name,
              agent.input_types,
              agent.output_types,
              agent.mcp_servers,
              agent.is_terminal ?? false,
            ],
          );
        }
        logger.info({}, 'workflows-esp: schema ensured and manifest seeded');
      } catch (err) {
        this.initPromise = null; // allow retry on next request
        throw err;
      } finally {
        client.release();
      }
    })();
    return this.initPromise;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async claimUserId(user_id: string): Promise<ClaimUserIdResult> {
    await this.init();
    const client: PoolClient = await this.pool.connect();
    try {
      const { rowCount } = await client.query(
        `INSERT INTO claimed_ids (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user_id],
      );
      return { claimed: (rowCount ?? 0) > 0, user_id };
    } finally {
      client.release();
    }
  }

  async listAgents(): Promise<AgentManifestEntry[]> {
    await this.init();
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<{
        agent_id: string;
        display_name: string;
        input_types: string[];
        output_types: string[];
        mcp_servers: string[];
        is_terminal: boolean | null;
      }>(
        `SELECT agent_id, display_name, input_types, output_types, mcp_servers, is_terminal
         FROM agents_manifest
         ORDER BY agent_id`,
      );
      return rows.map((r) => ({
        agent_id: r.agent_id,
        display_name: r.display_name,
        input_types: r.input_types,
        output_types: r.output_types,
        mcp_servers: r.mcp_servers,
        is_terminal: r.is_terminal ?? false,
      }));
    } finally {
      client.release();
    }
  }

  async validatePipeline(
    pipeline: PipelineStep[],
  ): Promise<{ valid: boolean; errors: Array<{ code: string; step?: number; message: string }> }> {
    return validatePipeline(pipeline as Pipeline);
  }

  async saveWorkflow(input: SaveWorkflowInput): Promise<SaveWorkflowResult> {
    await this.init();
    const validation = validatePipeline(input.pipeline as Pipeline);
    if (!validation.valid) throw new WorkflowValidationError(validation.errors);

    const client = await this.pool.connect();
    try {
      const visibility = input.visibility ?? 'private';
      const params = [
        input.user_id,
        input.slug,
        input.name,
        input.description,
        JSON.stringify(input.pipeline),
        input.output_spec,
        visibility,
      ];

      const updated = await client.query<WorkflowRowSql>(
        `UPDATE workflows SET
           name = $3, description = $4, pipeline = $5::jsonb, output_spec = $6,
           visibility = $7, status = 'active', version = version + 1, updated_at = now()
         WHERE user_id = $1 AND slug = $2
         RETURNING *`,
        params,
      );
      if (updated.rows.length === 1) {
        return { saved: true, workflow: mapWorkflowRow(updated.rows[0]) };
      }

      // New workflow: enforce the 50 non-archived workflows/user quota first.
      const { rows: quotaRows } = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM workflows WHERE user_id = $1 AND status <> 'archived'`,
        [input.user_id],
      );
      const active = Number(quotaRows[0]?.count ?? 0);
      if (active >= ACTIVE_QUOTA) throw new WorkflowQuotaError(ACTIVE_QUOTA, active);

      const inserted = await client.query<WorkflowRowSql>(
        `INSERT INTO workflows (user_id, slug, name, description, pipeline, output_spec, visibility)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
         RETURNING *`,
        params,
      );
      return { saved: true, workflow: mapWorkflowRow(inserted.rows[0]) };
    } finally {
      client.release();
    }
  }

  async listWorkflows(options: ListWorkflowsOptions): Promise<WorkflowRow[]> {
    await this.init();
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<WorkflowRowSql>(
        `SELECT * FROM workflows
         WHERE user_id = $1
            OR ($2::boolean AND visibility = 'team')
            OR ($3::boolean AND visibility = 'public')
         ORDER BY updated_at DESC`,
        [options.user_id, options.include_team === true, options.include_public === true],
      );
      return rows.map(mapWorkflowRow);
    } finally {
      client.release();
    }
  }

  async getWorkflow(user_id: string, slug: string): Promise<WorkflowRow | null> {
    await this.init();
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<WorkflowRowSql>(
        `SELECT * FROM workflows
         WHERE (user_id = $1 AND slug = $2) OR (slug = $2 AND visibility = 'public')
         ORDER BY (user_id = $1) DESC
         LIMIT 1`,
        [user_id, slug],
      );
      return rows.length === 1 ? mapWorkflowRow(rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async deleteWorkflow(user_id: string, slug: string): Promise<DeleteWorkflowResult> {
    await this.init();
    const client = await this.pool.connect();
    try {
      // workflow_runs rows cascade via the ON DELETE CASCADE FK.
      const { rowCount } = await client.query(
        `DELETE FROM workflows WHERE user_id = $1 AND slug = $2`,
        [user_id, slug],
      );
      return { deleted: (rowCount ?? 0) > 0 };
    } finally {
      client.release();
    }
  }

  async logRun(input: LogRunInput): Promise<LogRunResult> {
    await this.init();
    const client = await this.pool.connect();
    try {
      if (input.status === 'running') {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO workflow_runs (workflow_id, user_id, status) VALUES ($1, $2, 'running')
           RETURNING id`,
          [input.workflow_id, input.user_id],
        );
        return { run_id: rows[0].id };
      }

      // Terminal status: close the caller's open running row when one exists.
      const closed = await client.query<{ id: string }>(
        `UPDATE workflow_runs SET
           status = $3, completed_at = now(),
           output_summary = COALESCE($4, output_summary)
         WHERE workflow_id = $1 AND user_id = $2 AND status = 'running' AND completed_at IS NULL
         RETURNING id`,
        [input.workflow_id, input.user_id, input.status, input.output_summary ?? null],
      );
      if (closed.rows.length === 1) return { run_id: closed.rows[0].id };

      try {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO workflow_runs (workflow_id, user_id, status, completed_at, output_summary)
           VALUES ($1, $2, $3, now(), $4)
           RETURNING id`,
          [input.workflow_id, input.user_id, input.status, input.output_summary ?? null],
        );
        return { run_id: rows[0].id };
      } catch (err) {
        if (isForeignKeyViolation(err)) {
          throw new Error(`workflow ${input.workflow_id} does not exist (log_run)`);
        }
        throw err;
      }
    } finally {
      client.release();
    }
  }

  async deleteUser(user_id: string): Promise<{ deleted: boolean; workflows_cascade: number; runs_abandoned: number }> {
    await this.init();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      try {
        const abandoned = await client.query(
          `UPDATE workflow_runs SET status = 'abandoned', completed_at = COALESCE(completed_at, now())
           WHERE user_id = $1 AND status = 'running'`,
          [user_id],
        );
        const cascaded = await client.query(
          `DELETE FROM workflows WHERE user_id = $1`,
          [user_id],
        );
        const claimed = await client.query(
          `DELETE FROM claimed_ids WHERE user_id = $1`,
          [user_id],
        );
        await client.query('COMMIT');

        const workflows_cascade = cascaded.rowCount ?? 0;
        const runs_abandoned = abandoned.rowCount ?? 0;
        const deleted = workflows_cascade > 0 || runs_abandoned > 0 || (claimed.rowCount ?? 0) > 0;
        return { deleted, workflows_cascade, runs_abandoned };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } finally {
      client.release();
    }
  }
}

function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23503'
  );
}
