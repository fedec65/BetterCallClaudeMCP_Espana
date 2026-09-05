import { z } from 'zod';

/**
 * Raised by stub tool implementations that are pending follow-up work.
 * Mapped to MCP error envelope by `server.ts` with code "not_implemented".
 */
export class ToolNotImplementedError extends Error {
  readonly code = 'not_implemented';
  readonly tool: string;
  constructor(tool: string, hint?: string) {
    super(
      `Tool "${tool}" is not yet implemented in this scaffold (t33 / Map D #33).${
        hint ? ` ${hint}` : ''
      }`,
    );
    this.name = 'ToolNotImplementedError';
    this.tool = tool;
  }
}

/**
 * Raised by `validatePipeline` when a pipeline violates one of the contract
 * invariants. Mapped to `{valid:false, errors[]}` by `server.ts`.
 */
export class WorkflowValidationError extends Error {
  readonly code = 'workflow_validation_error';
  readonly errors: Array<{ code: string; step?: number; message: string }>;
  constructor(errors: Array<{ code: string; step?: number; message: string }>) {
    super('Pipeline validation failed');
    this.name = 'WorkflowValidationError';
    this.errors = errors;
  }
}

/**
 * Raised when a save would exceed the per-user workflow quota (ADR §5(a): 50 active).
 */
export class WorkflowQuotaError extends Error {
  readonly code = 'quota_exceeded';
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super(`Workflow quota exceeded: ${current}/${limit} active workflows for this user`);
    this.name = 'WorkflowQuotaError';
    this.limit = limit;
    this.current = current;
  }
}

/**
 * Wrap a Zod parse failure into the ADR-uniform error envelope payload.
 */
export function zodErrorEnvelope(error: z.ZodError) {
  return {
    error: 'invalid_input',
    issues: error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    })),
  };
}

/**
 * Wrap any error into the ADR-uniform generic error envelope payload.
 */
export function genericErrorEnvelope(err: unknown) {
  if (err instanceof Error) return { error: err.message };
  return { error: String(err) };
}
