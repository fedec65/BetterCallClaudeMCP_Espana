import type { Pipeline, AgentManifestEntry } from './types.js';
import { AGENTS_MANIFEST } from './types.js';

export interface ValidationError {
  code: 'unknown_agent' | 'incompatible_chaining' | 'non_sequential_steps';
  step?: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const VALIDATION_CODES = new Set<ValidationError['code']>([
  'unknown_agent',
  'incompatible_chaining',
  'non_sequential_steps',
]);

/**
 * Stateless pipeline validator — same contract as CH/IT.
 *
 * Checks:
 * 1. `non_sequential_steps`: every step.step must equal its 1-based index (1, 2, 3, ...).
 * 2. `unknown_agent`: every step.agent_id must appear in the manifest.
 * 3. `incompatible_chaining`: the output_types of step N must overlap with input_types of step N+1.
 *
 * @param pipeline  validated against `manifest`. Defaults to `AGENTS_MANIFEST`.
 * @param manifest  optional override for testability.
 */
export function validatePipeline(
  pipeline: Pipeline,
  manifest: AgentManifestEntry[] = AGENTS_MANIFEST,
): ValidationResult {
  const errors: ValidationError[] = [];

  // (1) sequential check
  for (let i = 0; i < pipeline.length; i++) {
    const expected = i + 1;
    if (pipeline[i].step !== expected) {
      errors.push({
        code: 'non_sequential_steps',
        step: pipeline[i].step,
        message: `step[${i}].step should be ${expected} (1-based sequential), got ${pipeline[i].step}`,
      });
    }
  }

  // build lookup once
  const byId = new Map<string, AgentManifestEntry>();
  for (const a of manifest) byId.set(a.agent_id, a);

  // (2) unknown agent
  for (let i = 0; i < pipeline.length; i++) {
    const step = pipeline[i];
    if (!byId.has(step.agent_id)) {
      errors.push({
        code: 'unknown_agent',
        step: step.step,
        message: `agent_id "${step.agent_id}" is not in the manifest`,
      });
    }
  }

  // (3) chaining compatibility — only when both endpoints resolve
  for (let i = 0; i < pipeline.length - 1; i++) {
    const cur = pipeline[i];
    const next = pipeline[i + 1];
    const curEntry = byId.get(cur.agent_id);
    const nextEntry = byId.get(next.agent_id);
    if (!curEntry || !nextEntry) continue; // covered by unknown_agent above
    const overlap = curEntry.output_types.some((t) => nextEntry.input_types.includes(t));
    if (!overlap) {
      errors.push({
        code: 'incompatible_chaining',
        step: cur.step,
        message: `step ${cur.step} ("${cur.agent_id}" outputs ${curEntry.output_types.join(',')}) is not compatible with step ${next.step} ("${next.agent_id}" inputs ${nextEntry.input_types.join(',')})`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export { VALIDATION_CODES };
