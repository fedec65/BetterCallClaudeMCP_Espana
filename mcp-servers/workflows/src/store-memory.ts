import type {
  AgentManifestEntry,
  Pipeline,
  PipelineStep,
} from './types.js';
import { AGENTS_MANIFEST } from './types.js';
import { validatePipeline } from './validate.js';
import { ToolNotImplementedError } from './errors.js';
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

/**
 * In-memory implementation of `WorkflowStore`. Used by unit/integration tests
 * so they can run without Postgres. Only `claimUserId`, `listAgents`, and
 * `validatePipeline` are functional — every other method throws
 * `ToolNotImplementedError` to make the scope of t33 explicit.
 */
export class InMemoryWorkflowStore implements WorkflowStore {
  private readonly claimed = new Set<string>();

  async claimUserId(user_id: string): Promise<ClaimUserIdResult> {
    const claimed = !this.claimed.has(user_id);
    if (claimed) this.claimed.add(user_id);
    return { claimed, user_id };
  }

  async listAgents(): Promise<AgentManifestEntry[]> {
    // Return a shallow copy so callers cannot mutate the module-level manifest.
    return AGENTS_MANIFEST.map((a) => ({ ...a, input_types: [...a.input_types], output_types: [...a.output_types], mcp_servers: [...a.mcp_servers] }));
  }

  async validatePipeline(
    pipeline: PipelineStep[],
  ): Promise<{ valid: boolean; errors: Array<{ code: string; step?: number; message: string }> }> {
    // Validate is pure but the store re-exports it for parity with the postgres path.
    return validatePipeline(pipeline as Pipeline);
  }

  // ---------------- stubs (out of scope for t33) ----------------
  async saveWorkflow(_input: SaveWorkflowInput): Promise<SaveWorkflowResult> {
    throw new ToolNotImplementedError(
      'save_workflow',
      'Pending t34 / #35 integration. Quota enforcement (50 active) and upsert SQL will be implemented alongside the Postgres store.',
    );
  }

  async listWorkflows(_options: ListWorkflowsOptions): Promise<WorkflowRow[]> {
    throw new ToolNotImplementedError(
      'list_workflows',
      'Pending t34 / #35 integration. Visibility filter (private/team/public) and owner-or-visible check pending.',
    );
  }

  async getWorkflow(_user_id: string, _slug: string): Promise<WorkflowRow | null> {
    throw new ToolNotImplementedError(
      'get_workflow',
      'Pending t34 / #35 integration.',
    );
  }

  async deleteWorkflow(_user_id: string, _slug: string): Promise<DeleteWorkflowResult> {
    throw new ToolNotImplementedError(
      'delete_workflow',
      'Pending t34 / #35 integration.',
    );
  }

  async logRun(_input: LogRunInput): Promise<LogRunResult> {
    throw new ToolNotImplementedError(
      'log_run',
      'Pending t34 / #35 integration.',
    );
  }

  async deleteUser(_user_id: string): Promise<{ deleted: boolean; workflows_cascade: number; runs_abandoned: number }> {
    throw new ToolNotImplementedError(
      'delete_user',
      'Pending t34 / #35 integration. LOPDGDD §17 cascade semantics pending.',
    );
  }

  /** Test helper: number of currently claimed user_ids. */
  size(): number {
    return this.claimed.size;
  }

  /** Test helper: clear all state. */
  reset(): void {
    this.claimed.clear();
  }
}
