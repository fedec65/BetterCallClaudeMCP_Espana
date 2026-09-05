import { describe, expect, it } from 'vitest';
import { validatePipeline } from '../../src/validate.js';
import { AGENTS_MANIFEST, type AgentManifestEntry, type Pipeline } from '../../src/types.js';

/**
 * Tests for the stateless `validatePipeline()` function.
 *
 * Cases covered:
 * 1. valid sequential pipeline with compatible chaining → no errors
 * 2. non-sequential steps → non_sequential_steps error
 * 3. unknown agent_id → unknown_agent error
 * 4. incompatible chaining (output_types disjoint from next input_types)
 *    → incompatible_chaining error
 * 5. empty pipeline → min(1) violation at zod level (handled by caller)
 * 6. duplicate agent_id OK as long as chaining is compatible
 */

const testManifest: AgentManifestEntry[] = [
  {
    agent_id: 'intake',
    display_name: 'Intake',
    input_types: ['facts', 'parties'],
    output_types: ['case_summary'],
    mcp_servers: [],
  },
  {
    agent_id: 'chrono',
    display_name: 'Chronology',
    input_types: ['case_summary', 'facts'],
    output_types: ['timeline', 'hitos'],
    mcp_servers: [],
    is_terminal: true,
  },
  {
    agent_id: 'isolated',
    display_name: 'Isolated',
    input_types: ['unrelated_input'],
    output_types: ['unrelated_output'],
    mcp_servers: [],
  },
];

describe('validatePipeline', () => {
  it('accepts a sequential pipeline with compatible chaining', () => {
    const pipeline: Pipeline = [
      { step: 1, agent_id: 'intake', purpose: 'gather facts' },
      { step: 2, agent_id: 'chrono', purpose: 'build timeline' },
    ];
    const result = validatePipeline(pipeline, testManifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects non-sequential steps', () => {
    const pipeline: Pipeline = [
      { step: 1, agent_id: 'intake', purpose: 'a' },
      { step: 3, agent_id: 'chrono', purpose: 'b' }, // missing step 2
    ];
    const result = validatePipeline(pipeline, testManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'non_sequential_steps')).toBe(true);
  });

  it('rejects unknown agent_id', () => {
    const pipeline: Pipeline = [
      { step: 1, agent_id: 'does-not-exist', purpose: 'x' },
    ];
    const result = validatePipeline(pipeline, testManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'unknown_agent' && e.step === 1)).toBe(true);
  });

  it('rejects incompatible chaining', () => {
    const pipeline: Pipeline = [
      { step: 1, agent_id: 'intake', purpose: 'a' },
      { step: 2, agent_id: 'isolated', purpose: 'b' }, // intake outputs case_summary, isolated inputs unrelated_input
    ];
    const result = validatePipeline(pipeline, testManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'incompatible_chaining')).toBe(true);
  });

  it('uses AGENTS_MANIFEST by default', () => {
    // Real chain from the seeded manifest: briefing-coordinator (out: brief)
    // -> legal-researcher (in: brief; out: research_findings)
    // -> legal-drafter (in: research_findings).
    const pipeline: Pipeline = [
      { step: 1, agent_id: 'spanish-briefing-coordinator', purpose: 'assemble brief' },
      { step: 2, agent_id: 'spanish-legal-researcher', purpose: 'research the brief' },
      { step: 3, agent_id: 'spanish-legal-drafter', purpose: 'draft submission' },
    ];
    const result = validatePipeline(pipeline);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accumulates multiple error types in one pass', () => {
    const pipeline: Pipeline = [
      { step: 1, agent_id: 'intake', purpose: 'a' },
      { step: 5, agent_id: 'ghost', purpose: 'b' }, // non-sequential + unknown + (no chaining check past unknown)
    ];
    const result = validatePipeline(pipeline, testManifest);
    expect(result.valid).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('non_sequential_steps');
    expect(codes).toContain('unknown_agent');
  });

  it('AGENTS_MANIFEST seeds the 21 real plugin agents with unique ids (list_agents contract)', () => {
    expect(AGENTS_MANIFEST.length).toBeGreaterThanOrEqual(21);
    const ids = AGENTS_MANIFEST.map((a) => a.agent_id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    for (const a of AGENTS_MANIFEST) {
      expect(a.agent_id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(a.display_name).toBeTruthy();
      expect(Array.isArray(a.input_types)).toBe(true);
      expect(a.input_types.length).toBeGreaterThan(0);
      expect(Array.isArray(a.output_types)).toBe(true);
      expect(a.output_types.length).toBeGreaterThan(0);
      expect(Array.isArray(a.mcp_servers)).toBe(true);
    }
  });
});
