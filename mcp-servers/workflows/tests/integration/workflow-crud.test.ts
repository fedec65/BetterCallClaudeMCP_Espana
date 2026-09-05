import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryWorkflowStore } from '../../src/store-memory.js';
import { WorkflowQuotaError } from '../../src/errors.js';
import type { SaveWorkflowInput } from '../../src/store.js';

/**
 * Store-level semantics of the in-memory provider (ADR §5):
 * quota, visibility filtering, owner-or-visible reads, run bookkeeping.
 * Same expectations apply to the Postgres store (SQL semantics are tested
 * against Postgres when DATABASE_URL is available).
 */
describe('InMemoryWorkflowStore (workflow semantics)', () => {
  const VALID_PIPELINE = [
    { step: 1, agent_id: 'spanish-briefing-coordinator', purpose: 'assemble brief' },
    { step: 2, agent_id: 'spanish-legal-researcher', purpose: 'research' },
  ];

  const save = (user_id: string, slug: string, extra: Partial<SaveWorkflowInput> = {}) =>
    ({
      user_id,
      slug,
      name: `Flow ${slug}`,
      description: 'test workflow',
      pipeline: VALID_PIPELINE,
      output_spec: 'output',
      ...extra,
    }) as SaveWorkflowInput;

  let store: InMemoryWorkflowStore;

  afterEach(() => {
    store?.reset();
  });

  it('enforces the 50-active-workflows quota per user', async () => {
    store = new InMemoryWorkflowStore();
    for (let i = 0; i < 50; i++) {
      await store.saveWorkflow(save('bcc-quota-user', `flow-${String(i).padStart(2, '0')}`));
    }
    await expect(store.saveWorkflow(save('bcc-quota-user', 'flow-51'))).rejects.toBeInstanceOf(
      WorkflowQuotaError,
    );
    // A different user is unaffected.
    await expect(store.saveWorkflow(save('bcc-other-user', 'flow-01'))).resolves.toMatchObject({
      saved: true,
    });
  });

  it('list_workflows returns own rows regardless of flags, team/public only when requested', async () => {
    store = new InMemoryWorkflowStore();
    await store.saveWorkflow(save('bcc-alice', 'private-flow', { visibility: 'private' }));
    await store.saveWorkflow(save('bcc-alice', 'team-flow', { visibility: 'team' }));
    await store.saveWorkflow(save('bcc-alice', 'public-flow', { visibility: 'public' }));

    const own = await store.listWorkflows({ user_id: 'bcc-alice' });
    expect(own).toHaveLength(3);

    const asBob = await store.listWorkflows({ user_id: 'bcc-bob' });
    expect(asBob).toHaveLength(0);

    const bobTeam = await store.listWorkflows({ user_id: 'bcc-bob', include_team: true });
    expect(bobTeam.map((w) => w.slug).sort()).toEqual(['team-flow']);

    const bobPublic = await store.listWorkflows({ user_id: 'bcc-bob', include_public: true });
    expect(bobPublic.map((w) => w.slug).sort()).toEqual(['public-flow']);
  });

  it('get_workflow prefers the caller own row over a public row with the same slug', async () => {
    store = new InMemoryWorkflowStore();
    await store.saveWorkflow(save('bcc-alice', 'shared-slug', { visibility: 'public' }));
    await store.saveWorkflow(save('bcc-bob', 'shared-slug', { visibility: 'private' }));

    const bobView = await store.getWorkflow('bcc-bob', 'shared-slug');
    expect(bobView?.user_id).toBe('bcc-bob');

    const aliceView = await store.getWorkflow('bcc-alice', 'shared-slug');
    expect(aliceView?.user_id).toBe('bcc-alice');
  });

  it('delete_workflow on a missing (user, slug) returns deleted:false', async () => {
    store = new InMemoryWorkflowStore();
    await expect(store.deleteWorkflow('bcc-nobody', 'nope')).resolves.toEqual({ deleted: false });
  });

  it('log_run: terminal status without an open running row inserts a new closed row', async () => {
    store = new InMemoryWorkflowStore();
    const { workflow } = await store.saveWorkflow(save('bcc-alice', 'flow-a'));
    const first = await store.logRun({
      workflow_id: workflow.id,
      user_id: 'bcc-alice',
      status: 'completed',
      output_summary: 'solo run',
    });
    expect(store.runCount()).toBe(1);

    const second = await store.logRun({
      workflow_id: workflow.id,
      user_id: 'bcc-alice',
      status: 'completed',
      output_summary: 'another run',
    });
    expect(second.run_id).not.toBe(first.run_id);
    expect(store.runCount()).toBe(2);
  });
});
