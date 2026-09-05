import { z } from 'zod';

/**
 * user_id schema — replica CH/IT contract (ADR §3(c)):
 * - 1–128 chars
 * - charset: A-Z a-z 0-9 . _ @ -
 *
 * Used for: claimed_ids.user_id, workflows.user_id, workflow_runs.user_id, delete_user.user_id.
 */
export const UserIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._@-]+$/, {
    message: 'user_id must match ^[A-Za-z0-9._@-]+$ (1–128 chars)',
  });

/**
 * Workflow slug — kebab-case (ADR §"Schema constraints"):
 * - 1–64 chars
 * - regex ^[a-z0-9][a-z0-9-]*$
 */
export const SlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'slug must match ^[a-z0-9][a-z0-9-]*$ (1–64 chars, kebab-case)',
  });

/**
 * Workflow visibility (ADR §"Schema Postgres" CHECK constraint).
 */
export const VisibilitySchema = z.enum(['private', 'team', 'public']);

/**
 * Workflow status.
 */
export const StatusSchema = z.enum(['draft', 'active', 'archived']);

/**
 * Single pipeline step (ADR §"Schema constraints").
 * step must be a positive int and sequentially numbered 1..N.
 */
export const PipelineStepSchema = z.object({
  step: z.number().int().positive(),
  agent_id: z.string().min(1),
  purpose: z.string().min(1).max(500),
  checkpoint: z.boolean().optional(),
});

/**
 * Pipeline — non-empty array of PipelineStep.
 */
export const PipelineSchema = z
  .array(PipelineStepSchema)
  .min(1, { message: 'pipeline must have at least 1 step' });

/**
 * Workflow row (full persistence shape).
 */
export const WorkflowRowSchema = z.object({
  id: z.string().uuid(),
  user_id: UserIdSchema,
  slug: SlugSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  pipeline: PipelineSchema,
  output_spec: z.string().min(1).max(2000),
  visibility: VisibilitySchema.default('private'),
  status: StatusSchema.default('active'),
  version: z.number().int().positive().default(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserId = z.infer<typeof UserIdSchema>;
export type Slug = z.infer<typeof SlugSchema>;
export type Visibility = z.infer<typeof VisibilitySchema>;
export type Status = z.infer<typeof StatusSchema>;
export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;
export type WorkflowRow = z.infer<typeof WorkflowRowSchema>;

/**
 * Agent manifest entry — single chainable agent.
 * Field semantics mirror CH/IT contract.
 */
export interface AgentManifestEntry {
  agent_id: string;
  display_name: string;
  input_types: string[];
  output_types: string[];
  mcp_servers: string[];
  is_terminal?: boolean;
}

/**
 * AGENTS_MANIFEST — seed of chainable ESP plugin agents.
 * TODO(t34 / #35 integration): curate from `bettercallclaude-espana/agents/*.md`.
 * Current stub: 2 placeholder agents so list_agents returns something usable for tests.
 */
export const AGENTS_MANIFEST: AgentManifestEntry[] = [
  {
    agent_id: 'legal-intake',
    display_name: 'Legal Intake (ES)',
    input_types: ['facts', 'parties'],
    output_types: ['case_summary', 'jurisdictional_notes'],
    mcp_servers: ['legal-citations-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'legal-chronology',
    display_name: 'Legal Chronology Builder (ES)',
    input_types: ['case_summary', 'jurisdictional_notes', 'documents'],
    output_types: ['timeline', 'hitos_procesales'],
    mcp_servers: ['cendoj-jurisprudencia', 'boe-legislacion'],
    is_terminal: true,
  },
];
