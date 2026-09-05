import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { PostgresWorkflowStore } from '../../src/store-postgres.js';

/**
 * Postgres provider tests (production store, ADR §2). Runs only when a
 * DATABASE_URL is provided (CI/local default: skip). Each run uses a unique
 * user_id and cleans up after itself via delete_user.
 */
const DATABASE_URL = process.env.DATABASE_URL;

const describePg = DATABASE_URL ? describe : describe.skip;

describePg('PostgresWorkflowStore', () => {
  const user_id = `bcc-pg-${randomUUID().slice(0, 8)}`;
  const VALID_PIPELINE = [
    { step: 1, agent_id: 'spanish-briefing-coordinator', purpose: 'assemble brief' },
    { step: 2, agent_id: 'spanish-legal-researcher', purpose: 'research' },
  ];

  let store: PostgresWorkflowStore;

  beforeAll(() => {
    store = new PostgresWorkflowStore();
  });

  afterAll(async () => {
    await store.deleteUser(user_id);
    await store.close();
  });

  it('initializes the ADR schema (idempotent)', async () => {
    await expect(store.init()).resolves.toBeUndefined();
    await expect(store.init()).resolves.toBeUndefined();
  });

  it('saves and retrieves a workflow with full round-trip fidelity', async () => {
    const saved = await store.saveWorkflow({
      user_id,
      slug: 'pg-flow',
      name: 'PG flow',
      description: 'round trip',
      pipeline: VALID_PIPELINE,
      output_spec: 'out',
      visibility: 'team',
    });
    expect(saved.workflow.version).toBe(1);
    expect(saved.workflow.visibility).toBe('team');

    const got = await store.getWorkflow(user_id, 'pg-flow');
    expect(got).toMatchObject({ user_id, slug: 'pg-flow', version: 1, visibility: 'team' });
    expect(got?.pipeline).toHaveLength(2);
    expect(got?.created_at).toEqual(got?.updated_at);
  });

  it('upserts on (user_id, slug) bumping version', async () => {
    const updated = await store.saveWorkflow({
      user_id,
      slug: 'pg-flow',
      name: 'PG flow v2',
      description: 'updated',
      pipeline: VALID_PIPELINE,
      output_spec: 'out v2',
    });
    expect(updated.workflow.version).toBe(2);
    const rows = await store.listWorkflows({ user_id });
    expect(rows).toHaveLength(1);
  });

  it('logs runs and closes the open running row', async () => {
    const { workflow } = await store.saveWorkflow({
      user_id,
      slug: 'pg-runs',
      name: 'PG runs',
      description: 'audit',
      pipeline: VALID_PIPELINE,
      output_spec: 'out',
    });
    const started = await store.logRun({
      workflow_id: workflow.id,
      user_id,
      status: 'running',
    });
    const done = await store.logRun({
      workflow_id: workflow.id,
      user_id,
      status: 'completed',
      output_summary: 'ok',
    });
    expect(done.run_id).toBe(started.run_id);
  });

  it('delete_workflow is owner-scoped', async () => {
    const foreign = await store.deleteWorkflow('bcc-someone-else', 'pg-flow');
    expect(foreign).toEqual({ deleted: false });
    const own = await store.deleteWorkflow(user_id, 'pg-flow');
    expect(own).toEqual({ deleted: true });
  });

  it('delete_user cascades workflows and claims', async () => {
    await store.claimUserId(user_id);
    const res = await store.deleteUser(user_id);
    expect(res).toMatchObject({ deleted: true, workflows_cascade: 1 });
    const rows = await store.listWorkflows({ user_id });
    expect(rows).toHaveLength(0);
  });
});
