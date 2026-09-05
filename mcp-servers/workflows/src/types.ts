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
 * AGENTS_MANIFEST — seed of the 21 chainable ESP plugin agents, curated from
 * `bettercallclaude-espana/agents/*.md` (Map D t34 / #35):
 * - `agent_id` = frontmatter `name:` of the plugin agent file.
 * - `input_types` / `output_types` = controlled vocabulary of chaining types
 *   (see ADR §"Schema constraints"); two agents chain when the first's
 *   `output_types` overlap the second's `input_types`.
 * - `mcp_servers` = MCP servers the agent's frontmatter `tools:` reference
 *   (deduplicated; agents without `mcp__*__` tools list none).
 * - `is_terminal` = true only for `spanish-summarizer` (pipeline end).
 */
export const AGENTS_MANIFEST: AgentManifestEntry[] = [
  {
    agent_id: 'autonomic-law-expert',
    display_name: 'Autonomic Law Expert',
    input_types: ['legal_query', 'case_facts', 'brief', 'documents'],
    output_types: ['analysis'],
    mcp_servers: ['catalunya-legal', 'congreso-debates', 'derecho-historico'],
    is_terminal: false,
  },
  {
    agent_id: 'chronology-builder',
    display_name: 'Chronology Builder',
    input_types: ['documents', 'case_facts', 'brief'],
    output_types: ['chronology'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-adversary',
    display_name: 'Spanish Adversary',
    input_types: ['case_facts', 'position', 'research_findings', 'brief', 'strategy', 'draft_text'],
    output_types: ['challenge'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-advocate',
    display_name: 'Spanish Advocate',
    input_types: ['case_facts', 'research_findings', 'brief', 'strategy', 'chronology'],
    output_types: ['position'],
    mcp_servers: ['cendoj-jurisprudencia', 'doctrina-academica', 'legal-persona-esp', 'tribunal-constitucional'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-briefing-coordinator',
    display_name: 'Spanish Briefing Coordinator',
    input_types: ['legal_query', 'case_facts', 'documents'],
    output_types: ['brief'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-citation-expert',
    display_name: 'Spanish Citation Expert',
    input_types: ['draft_text', 'research_findings', 'citations'],
    output_types: ['verified_citations'],
    mcp_servers: ['legal-citations-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-compliance-expert',
    display_name: 'Spanish Compliance Expert',
    input_types: ['legal_query', 'contract', 'case_facts', 'brief', 'analysis', 'documents'],
    output_types: ['compliance_report', 'analysis'],
    mcp_servers: ['busqueda-general', 'legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-corporate-expert',
    display_name: 'Spanish Corporate Expert',
    input_types: ['legal_query', 'contract', 'case_facts', 'brief', 'analysis'],
    output_types: ['analysis'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-data-protection-expert',
    display_name: 'Spanish Data Protection Expert',
    input_types: ['legal_query', 'contract', 'case_facts', 'analysis'],
    output_types: ['analysis'],
    mcp_servers: ['eu-law-esp', 'legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-fiscal-expert',
    display_name: 'Spanish Fiscal Expert',
    input_types: ['legal_query', 'contract', 'case_facts', 'analysis'],
    output_types: ['analysis'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-judicial-analyst',
    display_name: 'Spanish Judicial Analyst',
    input_types: ['analysis', 'position', 'challenge', 'research_findings', 'case_facts', 'strategy', 'chronology'],
    output_types: ['analysis', 'position'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-legal-drafter',
    display_name: 'Spanish Legal Drafter',
    input_types: ['research_findings', 'analysis', 'brief', 'strategy', 'risk_assessment', 'compliance_report', 'position', 'contract', 'citations', 'chronology', 'structured_prompt', 'challenge'],
    output_types: ['draft_text', 'contract'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-legal-researcher',
    display_name: 'Spanish Legal Researcher',
    input_types: ['legal_query', 'case_facts', 'brief', 'structured_prompt', 'chronology'],
    output_types: ['research_findings', 'citations'],
    mcp_servers: ['boe-legislacion', 'cendoj-jurisprudencia', 'doctrina-academica', 'tribunal-constitucional'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-legal-translator',
    display_name: 'Spanish Legal Translator',
    input_types: ['draft_text', 'contract', 'analysis', 'brief'],
    output_types: ['translation'],
    mcp_servers: [],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-litigation-strategist',
    display_name: 'Spanish Litigation Strategist',
    input_types: ['case_facts', 'research_findings', 'brief', 'chronology', 'legal_query'],
    output_types: ['strategy', 'procedural_plan'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-orchestrator',
    display_name: 'Spanish Orchestrator',
    input_types: ['legal_query', 'case_facts'],
    output_types: ['task_plan'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-procedure-expert',
    display_name: 'Spanish Procedure Expert',
    input_types: ['legal_query', 'research_findings', 'brief', 'case_facts'],
    output_types: ['procedural_plan'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-prompt-engineer',
    display_name: 'Spanish Prompt Engineer',
    input_types: ['legal_query'],
    output_types: ['structured_prompt'],
    mcp_servers: [],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-realestate-expert',
    display_name: 'Spanish Real Estate Expert',
    input_types: ['legal_query', 'contract', 'case_facts', 'documents'],
    output_types: ['analysis'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-risk-analyst',
    display_name: 'Spanish Risk Analyst',
    input_types: ['analysis', 'case_facts', 'strategy', 'research_findings', 'brief'],
    output_types: ['risk_assessment'],
    mcp_servers: ['legal-persona-esp'],
    is_terminal: false,
  },
  {
    agent_id: 'spanish-summarizer',
    display_name: 'Spanish Summarizer',
    input_types: ['research_findings', 'analysis', 'strategy', 'risk_assessment', 'compliance_report', 'draft_text', 'citations', 'verified_citations', 'chronology', 'translation', 'brief', 'position', 'challenge'],
    output_types: ['executive_summary'],
    mcp_servers: [],
    is_terminal: true,
  },
];
