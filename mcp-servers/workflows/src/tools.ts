import { z } from 'zod';
import type { WorkflowStore } from './store.js';
import {
  UserIdSchema,
  SlugSchema,
  VisibilitySchema,
  PipelineSchema,
} from './types.js';

/**
 * Tool input schemas (zod). Used by the factory in `server.ts` to validate
 * requests at the MCP boundary, matching the ADR error envelope contract.
 */

// ---------- claim_user_id ----------
export const ClaimUserIdInputSchema = z.object({
  user_id: UserIdSchema,
});

// ---------- list_agents ----------
// (no inputs)

// ---------- validate_pipeline ----------
export const ValidatePipelineInputSchema = z.object({
  pipeline: PipelineSchema,
});

// ---------- save_workflow ----------
export const SaveWorkflowInputSchema = z.object({
  user_id: UserIdSchema,
  slug: SlugSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  pipeline: PipelineSchema,
  output_spec: z.string().min(1).max(2000),
  visibility: VisibilitySchema.default('private'),
});

// ---------- list_workflows ----------
export const ListWorkflowsInputSchema = z.object({
  user_id: UserIdSchema,
  include_team: z.boolean().optional(),
  include_public: z.boolean().optional(),
});

// ---------- get_workflow ----------
export const GetWorkflowInputSchema = z.object({
  user_id: UserIdSchema,
  slug: SlugSchema,
});

// ---------- delete_workflow ----------
export const DeleteWorkflowInputSchema = z.object({
  user_id: UserIdSchema,
  slug: SlugSchema,
});

// ---------- log_run ----------
export const LogRunInputSchema = z.object({
  workflow_id: z.string().uuid(),
  user_id: UserIdSchema,
  status: z.enum(['running', 'completed', 'failed', 'abandoned']),
  output_summary: z.string().max(4000).optional(),
});

// ---------- delete_user ----------
export const DeleteUserInputSchema = z.object({
  user_id: UserIdSchema,
});

/**
 * Tool dispatcher. The factory passes raw `args` (unknown shape); this
 * function validates against the matching schema and delegates to the store.
 *
 * Returns the success payload (will be JSON-stringified into the
 * `{content:[{type:"text", text:...}]}` MCP envelope by the factory).
 *
 * Throws:
 *   - z.ZodError on invalid input → factory wraps as `{error:"invalid_input", issues:[...]}`.
 *   - ToolNotImplementedError for stub tools → factory wraps as `{error:"not_implemented", tool}`.
 *   - WorkflowQuotaError on quota breach → factory wraps as `{error:"quota_exceeded", limit, current}`.
 *   - WorkflowValidationError on pipeline violation → factory wraps as `{valid:false, errors[]}`.
 */
export async function dispatchTool(
  store: WorkflowStore,
  name: string,
  args: unknown,
): Promise<unknown> {
  switch (name) {
    case 'claim_user_id': {
      const input = ClaimUserIdInputSchema.parse(args);
      return store.claimUserId(input.user_id);
    }

    case 'list_agents': {
      return store.listAgents();
    }

    case 'validate_pipeline': {
      const input = ValidatePipelineInputSchema.parse(args);
      return store.validatePipeline(input.pipeline);
    }

    case 'save_workflow': {
      const input = SaveWorkflowInputSchema.parse(args);
      return store.saveWorkflow(input);
    }

    case 'list_workflows': {
      const input = ListWorkflowsInputSchema.parse(args);
      return store.listWorkflows(input);
    }

    case 'get_workflow': {
      const input = GetWorkflowInputSchema.parse(args);
      return store.getWorkflow(input.user_id, input.slug);
    }

    case 'delete_workflow': {
      const input = DeleteWorkflowInputSchema.parse(args);
      return store.deleteWorkflow(input.user_id, input.slug);
    }

    case 'log_run': {
      const input = LogRunInputSchema.parse(args);
      return store.logRun(input);
    }

    case 'delete_user': {
      const input = DeleteUserInputSchema.parse(args);
      return store.deleteUser(input.user_id);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
