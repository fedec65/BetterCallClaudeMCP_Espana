import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';
import { logger } from '@bettercallclaude/esp-shared';
import type { WorkflowStore } from './store.js';
import { dispatchTool } from './tools.js';
import {
  ToolNotImplementedError,
  WorkflowQuotaError,
  WorkflowValidationError,
  genericErrorEnvelope,
  zodErrorEnvelope,
} from './errors.js';

const SERVER_NAME = 'bettercallclaude-esp-workflows';
const SERVER_VERSION = '0.2.0';

/**
 * Tool descriptors advertised by the server. Input schemas mirror the zod
 * schemas in `tools.ts`; annotations match ADR §"Tool surface finale".
 */
const TOOL_DESCRIPTORS: Tool[] = [
  {
    name: 'claim_user_id',
    description:
      'Reserve a user_id in the claimed_ids table (idempotent: returns claimed=false if already taken). The plugin client resolves user_id via a 4-fallback chain before invoking this tool.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: '1–128 chars matching ^[A-Za-z0-9._@-]+$',
          pattern: '^[A-Za-z0-9._@-]+$',
        },
      },
      required: ['user_id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'list_agents',
    description:
      'Return the chainable plugin agents (from agents_manifest). Used to drive the /create-workflow interview.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'validate_pipeline',
    description:
      'Stateless check of a pipeline against the agent manifest. Returns {valid, errors[]}. Does not persist.',
    inputSchema: {
      type: 'object',
      properties: {
        pipeline: {
          type: 'array',
          description: 'Array of pipeline steps (min 1).',
          items: {
            type: 'object',
            properties: {
              step: { type: 'integer', minimum: 1 },
              agent_id: { type: 'string' },
              purpose: { type: 'string' },
              checkpoint: { type: 'boolean' },
            },
            required: ['step', 'agent_id', 'purpose'],
          },
        },
      },
      required: ['pipeline'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'save_workflow',
    description:
      'Upsert a workflow keyed by (user_id, slug). Re-validates server-side; enforces 50-active quota per user; bumps version on update.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        slug: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        pipeline: { type: 'array' },
        output_spec: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'team', 'public'] },
      },
      required: ['user_id', 'slug', 'name', 'description', 'pipeline', 'output_spec'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'list_workflows',
    description:
      'List workflows visible to caller (own + optionally team + public).',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        include_team: { type: 'boolean' },
        include_public: { type: 'boolean' },
      },
      required: ['user_id'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'get_workflow',
    description:
      'Fetch one workflow by slug with owner-or-visible check.',
    inputSchema: {
      type: 'object',
      properties: { user_id: { type: 'string' }, slug: { type: 'string' } },
      required: ['user_id', 'slug'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'delete_workflow',
    description:
      "Delete one of the caller's own workflows (owner-only).",
    inputSchema: {
      type: 'object',
      properties: { user_id: { type: 'string' }, slug: { type: 'string' } },
      required: ['user_id', 'slug'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: 'log_run',
    description:
      'Append an audit row to workflow_runs. completed_at is set automatically unless status="running".',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string' },
        user_id: { type: 'string' },
        status: { type: 'string', enum: ['running', 'completed', 'failed', 'abandoned'] },
        output_summary: { type: 'string' },
      },
      required: ['workflow_id', 'user_id', 'status'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'delete_user',
    description:
      'LOPDGDD §17 cascade-delete: drop user, all their workflows, and their claimed_id; mark pre-existing runs status="abandoned" for audit.',
    inputSchema: {
      type: 'object',
      properties: { user_id: { type: 'string' } },
      required: ['user_id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
];

export interface CreateWorkflowsServerOptions {
  store: WorkflowStore;
}

/**
 * Factory: builds the MCP `Server` instance and wires up the request
 * handlers. Stateless — the store is injected via options.
 */
export function createWorkflowsServer(options: CreateWorkflowsServerOptions): Server {
  const { store } = options;
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DESCRIPTORS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const value = await dispatchTool(store, name, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      };
    } catch (err) {
      // Map known error types into the ADR-uniform envelope.
      let envelope: unknown;
      let isError = true;

      if (err instanceof ToolNotImplementedError) {
        envelope = { error: 'not_implemented', tool: err.tool };
        logger.warn({ tool: name }, 'Stub tool invoked');
      } else if (err instanceof ZodError) {
        envelope = zodErrorEnvelope(err);
      } else if (err instanceof WorkflowQuotaError) {
        envelope = { error: 'quota_exceeded', limit: err.limit, current: err.current };
      } else if (err instanceof WorkflowValidationError) {
        envelope = { valid: false, errors: err.errors };
      } else if (err instanceof Error && 'issues' in err) {
        // Fall-through: zod-like shape but not caught by instanceof above.
        envelope = zodErrorEnvelope(err as unknown as ZodError);
      } else {
        envelope = genericErrorEnvelope(err);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(envelope) }],
        isError,
      };
    }
  });

  return server;
}
