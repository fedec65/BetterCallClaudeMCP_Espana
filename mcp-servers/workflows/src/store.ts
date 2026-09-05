import type {
  AgentManifestEntry,
  Pipeline,
  PipelineStep,
  Status,
  Visibility,
  WorkflowRow,
} from './types.js';

export interface ClaimUserIdResult {
  claimed: boolean;
  user_id: string;
}

export interface ListWorkflowsOptions {
  user_id: string;
  include_team?: boolean;
  include_public?: boolean;
}

export interface SaveWorkflowInput {
  user_id: string;
  slug: string;
  name: string;
  description: string;
  pipeline: Pipeline;
  output_spec: string;
  visibility?: Visibility;
}

export interface SaveWorkflowResult {
  saved: true;
  workflow: WorkflowRow;
}

export interface DeleteWorkflowResult {
  deleted: boolean;
}

export interface LogRunInput {
  workflow_id: string;
  user_id: string;
  status: 'running' | 'completed' | 'failed' | 'abandoned';
  output_summary?: string;
}

export interface LogRunResult {
  run_id: string;
}

/**
 * Storage abstraction for `workflows-esp`. The factory `createWorkflowsServer`
 * delegates to one of these — production uses `PostgresWorkflowStore`, tests
 * use `InMemoryWorkflowStore`.
 *
 * **Status by tool (scaffold t33)**:
 * - `claimUserId`, `listAgents`, `validatePipeline` → fully implemented in both stores.
 * - All other methods → throw `ToolNotImplementedError` (pending t34 / #35).
 */
export interface WorkflowStore {
  // ---------- implemented in scaffold ----------
  claimUserId(user_id: string): Promise<ClaimUserIdResult>;
  listAgents(): Promise<AgentManifestEntry[]>;
  validatePipeline(pipeline: PipelineStep[]): Promise<{ valid: boolean; errors: Array<{ code: string; step?: number; message: string }> }>;

  // ---------- stubs (ToolNotImplementedError) ----------
  saveWorkflow(input: SaveWorkflowInput): Promise<SaveWorkflowResult>;
  listWorkflows(options: ListWorkflowsOptions): Promise<WorkflowRow[]>;
  getWorkflow(user_id: string, slug: string): Promise<WorkflowRow | null>;
  deleteWorkflow(user_id: string, slug: string): Promise<DeleteWorkflowResult>;
  logRun(input: LogRunInput): Promise<LogRunResult>;
  deleteUser(user_id: string): Promise<{ deleted: boolean; workflows_cascade: number; runs_abandoned: number }>;
}

export type { AgentManifestEntry, Pipeline, PipelineStep, Status, Visibility, WorkflowRow };
