import { randomUUID } from 'crypto';
import type {
  AgentManifestEntry,
  Pipeline,
  PipelineStep,
  Status,
  Visibility,
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

interface RunRow {
  id: string;
  workflow_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'abandoned';
  output_summary: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * In-memory implementation of `WorkflowStore`. Used by unit/integration tests
 * so they can run without Postgres, and as the fallback provider when neither
 * `DATABASE_URL` nor `WORKFLOWS_STORE=sqlite` is configured (`resolveStore`).
 *
 * Semantics mirror the Postgres store (see ADR 0001):
 * - `saveWorkflow` upserts on `(user_id, slug)`, re-validates the pipeline,
 *   enforces the 50 non-archived workflows/user quota and bumps `version` on update.
 * - `listWorkflows` returns the caller's own rows plus — when requested —
 *   every `team` and/or `public` row (team visibility is intentionally not
 *   membership-gated; the aggregator treats the whole deployment as one team).
 * - `getWorkflow` is owner-or-visible: caller's own row first, else any `public` row.
 * - `logRun` appends an audit row; a terminal status closes the caller's open
 *   `running` row for that workflow when one exists (else it inserts a new row).
 * - `deleteUser` cascades workflows + claimed_id and marks open runs `abandoned`.
 */
export class InMemoryWorkflowStore implements WorkflowStore {
  private readonly claimed = new Set<string>();
  private readonly workflows = new Map<string, WorkflowRow>();
  private readonly runs = new Map<string, RunRow>();

  private workflowKey(user_id: string, slug: string): string {
    return `${user_id}\u0000${slug}`;
  }

  async claimUserId(user_id: string): Promise<ClaimUserIdResult> {
    const claimed = !this.claimed.has(user_id);
    if (claimed) this.claimed.add(user_id);
    return { claimed, user_id };
  }

  async listAgents(): Promise<AgentManifestEntry[]> {
    // Return a deep-enough copy so callers cannot mutate the module-level manifest.
    return AGENTS_MANIFEST.map((a) => ({
      ...a,
      input_types: [...a.input_types],
      output_types: [...a.output_types],
      mcp_servers: [...a.mcp_servers],
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

    const key = this.workflowKey(input.user_id, input.slug);
    const existing = this.workflows.get(key);
    const visibility: Visibility = input.visibility ?? 'private';
    const status: Status = 'active';
    const now = nowIso();

    if (!existing) {
      // Quota applies only to new workflows: non-archived rows for this user.
      let active = 0;
      for (const w of this.workflows.values()) {
        if (w.user_id === input.user_id && w.status !== 'archived') active += 1;
      }
      if (active >= ACTIVE_QUOTA) throw new WorkflowQuotaError(ACTIVE_QUOTA, active);

      const workflow: WorkflowRow = {
        id: randomUUID(),
        user_id: input.user_id,
        slug: input.slug,
        name: input.name,
        description: input.description,
        pipeline: input.pipeline as PipelineStep[],
        output_spec: input.output_spec,
        visibility,
        status,
        version: 1,
        created_at: now,
        updated_at: now,
      };
      this.workflows.set(key, workflow);
      return { saved: true, workflow };
    }

    // Upsert: keep id/created_at, bump version, refresh updated_at.
    const workflow: WorkflowRow = {
      ...existing,
      name: input.name,
      description: input.description,
      pipeline: input.pipeline as PipelineStep[],
      output_spec: input.output_spec,
      visibility,
      status,
      version: existing.version + 1,
      updated_at: now,
    };
    this.workflows.set(key, workflow);
    return { saved: true, workflow };
  }

  async listWorkflows(options: ListWorkflowsOptions): Promise<WorkflowRow[]> {
    const results: WorkflowRow[] = [];
    for (const w of this.workflows.values()) {
      const visible =
        w.user_id === options.user_id ||
        (options.include_team === true && w.visibility === 'team') ||
        (options.include_public === true && w.visibility === 'public');
      if (visible) results.push(w);
    }
    // Most recently updated first, stable for tests.
    results.sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0));
    return results;
  }

  async getWorkflow(user_id: string, slug: string): Promise<WorkflowRow | null> {
    const own = this.workflows.get(this.workflowKey(user_id, slug));
    if (own) return own;
    for (const w of this.workflows.values()) {
      if (w.slug === slug && w.visibility === 'public') return w;
    }
    return null;
  }

  async deleteWorkflow(user_id: string, slug: string): Promise<DeleteWorkflowResult> {
    const key = this.workflowKey(user_id, slug);
    const existing = this.workflows.get(key);
    if (!existing) return { deleted: false };
    this.workflows.delete(key);
    // workflow_runs has ON DELETE CASCADE semantics.
    for (const [id, r] of this.runs) {
      if (r.workflow_id === existing.id) this.runs.delete(id);
    }
    return { deleted: true };
  }

  async logRun(input: LogRunInput): Promise<LogRunResult> {
    const now = nowIso();

    if (input.status === 'running') {
      const run: RunRow = {
        id: randomUUID(),
        workflow_id: input.workflow_id,
        user_id: input.user_id,
        started_at: now,
        completed_at: null,
        status: 'running',
        output_summary: null,
      };
      this.runs.set(run.id, run);
      return { run_id: run.id };
    }

    // Terminal status: close the caller's open running row for this workflow
    // when one exists; otherwise append a new (already-closed) audit row.
    for (const r of this.runs.values()) {
      if (
        r.workflow_id === input.workflow_id &&
        r.status === 'running' &&
        r.completed_at === null
      ) {
        r.status = input.status;
        r.completed_at = now;
        if (input.output_summary !== undefined) r.output_summary = input.output_summary;
        return { run_id: r.id };
      }
    }

    const run: RunRow = {
      id: randomUUID(),
      workflow_id: input.workflow_id,
      user_id: input.user_id,
      started_at: now,
      completed_at: now,
      status: input.status,
      output_summary: input.output_summary ?? null,
    };
    this.runs.set(run.id, run);
    return { run_id: run.id };
  }

  async deleteUser(user_id: string): Promise<{ deleted: boolean; workflows_cascade: number; runs_abandoned: number }> {
    let workflows_cascade = 0;
    let runs_abandoned = 0;

    for (const [key, w] of this.workflows) {
      if (w.user_id === user_id) {
        this.workflows.delete(key);
        workflows_cascade += 1;
        for (const [id, r] of this.runs) {
          if (r.workflow_id === w.id) this.runs.delete(id);
        }
      }
    }

    for (const r of this.runs.values()) {
      if (r.user_id === user_id && r.status === 'running') {
        r.status = 'abandoned';
        r.completed_at = r.completed_at ?? nowIso();
        runs_abandoned += 1;
      }
    }

    const claimed = this.claimed.delete(user_id);
    const deleted = claimed || workflows_cascade > 0 || runs_abandoned > 0;
    return { deleted, workflows_cascade, runs_abandoned };
  }

  // ---------------- test helpers ----------------

  /** Number of currently claimed user_ids. */
  size(): number {
    return this.claimed.size;
  }

  /** Number of stored workflows (any owner). */
  workflowCount(): number {
    return this.workflows.size;
  }

  /** Number of stored run rows (any owner). */
  runCount(): number {
    return this.runs.size;
  }

  /** Clear all state. */
  reset(): void {
    this.claimed.clear();
    this.workflows.clear();
    this.runs.clear();
  }
}
