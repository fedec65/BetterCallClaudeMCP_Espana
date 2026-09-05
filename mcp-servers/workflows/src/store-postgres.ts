import { Pool, type PoolClient } from 'pg';
import type {
  AgentManifestEntry,
  Pipeline,
  PipelineStep,
} from './types.js';
import { AGENTS_MANIFEST } from './types.js';
import { validatePipeline } from './validate.js';
import { ToolNotImplementedError } from './errors.js';
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
  WorkflowRow,
  WorkflowStore,
} from './store.js';

interface PostgresOptions {
  connectionString?: string; // defaults to process.env.DATABASE_URL
  poolMax?: number; // default 5
  ssl?: { rejectUnauthorized: boolean } | false; // auto by default
}

/**
 * Postgres-backed implementation of `WorkflowStore`.
 *
 * **Scope of t33 scaffold**:
 * - `init()` runs `SCHEMA_SQL` idempotently (memoized per process) and seeds
 *   `AGENTS_MANIFEST` with `ON CONFLICT (agent_id) DO UPDATE`.
 * - `claimUserId`, `listAgents`, `validatePipeline` are implemented.
 * - All other methods throw `ToolNotImplementedError` (pending t34 / #35).
 *
 * SSL behavior (per ADR §2):
 *   - For managed Postgres (Railway): `{ rejectUnauthorized: false }`.
 *   - For localhost / 127.0.0.1 / [::1] / explicit `sslmode=`: SSL disabled.
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

  // ---------------- implemented in scaffold ----------------

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

  // ---------------- stubs (out of scope for t33) ----------------
  async saveWorkflow(_input: SaveWorkflowInput): Promise<SaveWorkflowResult> {
    throw new ToolNotImplementedError(
      'save_workflow',
      'Pending t34 / #35. Will enforce 50-active quota + upsert keyed on (user_id, slug) + re-validate before write.',
    );
  }

  async listWorkflows(_options: ListWorkflowsOptions): Promise<WorkflowRow[]> {
    throw new ToolNotImplementedError('list_workflows', 'Pending t34 / #35.');
  }

  async getWorkflow(_user_id: string, _slug: string): Promise<WorkflowRow | null> {
    throw new ToolNotImplementedError('get_workflow', 'Pending t34 / #35.');
  }

  async deleteWorkflow(_user_id: string, _slug: string): Promise<DeleteWorkflowResult> {
    throw new ToolNotImplementedError('delete_workflow', 'Pending t34 / #35.');
  }

  async logRun(_input: LogRunInput): Promise<LogRunResult> {
    throw new ToolNotImplementedError('log_run', 'Pending t34 / #35.');
  }

  async deleteUser(_user_id: string): Promise<{ deleted: boolean; workflows_cascade: number; runs_abandoned: number }> {
    throw new ToolNotImplementedError('delete_user', 'Pending t34 / #35. LOPDGDD §17 cascade semantics.');
  }
}
