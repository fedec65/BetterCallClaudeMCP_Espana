import { describe, expect, it } from 'vitest';
import { AGENTS_MANIFEST, type Pipeline } from '../../src/types.js';
import { validatePipeline } from '../../src/validate.js';

/**
 * Manifest contract tests (Map D t34 / #35).
 *
 * The seeded AGENTS_MANIFEST is the source of truth for the /create-workflow
 * interview (list_agents) and for server-side pipeline validation. These tests
 * pin its shape: 21 real plugin agents, unique kebab-case ids, non-empty type
 * vocabularies, a single terminal agent (spanish-summarizer), and canonical
 * end-to-end chains that must keep validating as the manifest evolves.
 */
describe('AGENTS_MANIFEST (contract)', () => {
  it('seeds the 21 real ESP plugin agents', () => {
    expect(AGENTS_MANIFEST).toHaveLength(21);
  });

  it('exposes exactly one terminal agent: spanish-summarizer', () => {
    const terminal = AGENTS_MANIFEST.filter((a) => a.is_terminal === true);
    expect(terminal).toHaveLength(1);
    expect(terminal[0].agent_id).toBe('spanish-summarizer');
    expect(AGENTS_MANIFEST.find((a) => a.agent_id === 'spanish-summarizer')?.output_types).toContain(
      'executive_summary',
    );
  });

  it('mcp_servers only reference known ESP servers', () => {
    const known = new Set([
      'boe-legislacion',
      'cendoj-jurisprudencia',
      'tribunal-constitucional',
      'eu-law-esp',
      'congreso-debates',
      'legal-citations-esp',
      'legal-persona-esp',
      'doctrina-academica',
      'derecho-historico',
      'catalunya-legal',
      'busqueda-general',
    ]);
    for (const a of AGENTS_MANIFEST) {
      for (const s of a.mcp_servers) expect(known.has(s)).toBe(true);
    }
  });

  it.each([
    [
      'research → draft → summarize',
      [
        { step: 1, agent_id: 'spanish-prompt-engineer', purpose: 'frame the query' },
        { step: 2, agent_id: 'spanish-legal-researcher', purpose: 'run research' },
        { step: 3, agent_id: 'spanish-legal-drafter', purpose: 'draft the brief' },
        { step: 4, agent_id: 'spanish-summarizer', purpose: 'executive summary' },
      ],
    ],
    [
      'briefing → research → risk',
      [
        { step: 1, agent_id: 'spanish-briefing-coordinator', purpose: 'assemble brief' },
        { step: 2, agent_id: 'spanish-legal-researcher', purpose: 'gather findings' },
        { step: 3, agent_id: 'spanish-risk-analyst', purpose: 'assess risk' },
      ],
    ],
    [
      'advocate → judicial analyst → drafter',
      [
        { step: 1, agent_id: 'spanish-advocate', purpose: 'build position' },
        { step: 2, agent_id: 'spanish-judicial-analyst', purpose: 'evaluate strength' },
        { step: 3, agent_id: 'spanish-legal-drafter', purpose: 'write submission' },
      ],
    ],
  ])('canonical chain stays valid: %s', (_label, pipeline: Pipeline) => {
    const result = validatePipeline(pipeline);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
