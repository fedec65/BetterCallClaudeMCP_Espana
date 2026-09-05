import { describe, expect, it } from 'vitest';
import { openSqliteWorkflowStore, SqliteWorkflowStore } from '../../src/store-sqlite.js';

/**
 * SQLite provider tests (dev-only store, ADR §2). `better-sqlite3` is an
 * optionalDependency installed by default (`npm install` / `npm ci` install
 * optional deps unless `--omit=optional` is passed), so the driver is present
 * in every realistic test environment; `openSqliteWorkflowStore` raises a
 * clear error when it is not.
 */
const VALID_PIPELINE = [
  { step: 1, agent_id: 'spanish-briefing-coordinator', purpose: 'assemble brief' },
  { step: 2, agent_id: 'spanish-legal-researcher', purpose: 'research' },
];

describe('SqliteWorkflowStore', () => {
  async function openMemory(): Promise<SqliteWorkflowStore> {
    return openSqliteWorkflowStore(':memory:');
  }

  it('seeds agents_manifest and returns it via listAgents', async () => {
    const store = await openMemory();
    const agents = await store.listAgents();
    expect(agents).toHaveLength(21);
    expect(agents.some((a) => a.agent_id === 'spanish-summarizer' && a.is_terminal)).toBe(true);
  });

  it('saves, upserts (version bump) and retrieves workflows', async () => {
    const store = await openMemory();
    const first = await store.saveWorkflow({
      user_id: 'bcc-sqlite-test',
      slug: 'flusso-1',
      name: 'Flow one',
      description: 'first',
      pipeline: VALID_PIPELINE,
      output_spec: 'out',
    });
    expect(first.saved).toBe(true);
    expect(first.workflow.version).toBe(1);

    const second = await store.saveWorkflow({
      user_id: 'bcc-sqlite-test',
      slug: 'flusso-1',
      name: 'Flow one v2',
      description: 'updated',
      pipeline: VALID_PIPELINE,
      output_spec: 'out v2',
    });
    expect(second.workflow.version).toBe(2);

    const got = await store.getWorkflow('bcc-sqlite-test', 'flusso-1');
    expect(got?.name).toBe('Flow one v2');

    const rows = await store.listWorkflows({ user_id: 'bcc-sqlite-test' });
    expect(rows).toHaveLength(1);
  });

  it('rejects an invalid pipeline on save', async () => {
    const store = await openMemory();
    await expect(
      store.saveWorkflow({
        user_id: 'bcc-sqlite-test',
        slug: 'bad',
        name: 'Bad',
        description: 'bad pipeline',
        pipeline: [{ step: 1, agent_id: 'ghost', purpose: 'x' }],
        output_spec: 'out',
      }),
    ).rejects.toThrow();
  });

  it('keeps (user_id, slug) scoped across users', async () => {
    const store = await openMemory();
    await store.saveWorkflow({
      user_id: 'bcc-sqlite-test',
      slug: 'uniq',
      name: 'A',
      description: 'a',
      pipeline: VALID_PIPELINE,
      output_spec: 'out',
    });
    await store.saveWorkflow({
      user_id: 'bcc-other-user',
      slug: 'uniq',
      name: 'B',
      description: 'b',
      pipeline: VALID_PIPELINE,
      output_spec: 'out',
    });
    // Same slug, different users → own listing stays scoped.
    const rows = await store.listWorkflows({ user_id: 'bcc-sqlite-test' });
    expect(rows).toHaveLength(1);
  });

  it('log_run: running then completed closes the same run; delete_user cascades', async () => {
    const store = await openMemory();
    const { workflow } = await store.saveWorkflow({
      user_id: 'bcc-sqlite-test',
      slug: 'run-flow',
      name: 'Run flow',
      description: 'runs',
      pipeline: VALID_PIPELINE,
      output_spec: 'out',
    });

    const started = await store.logRun({
      workflow_id: workflow.id,
      user_id: 'bcc-sqlite-test',
      status: 'running',
    });
    const done = await store.logRun({
      workflow_id: workflow.id,
      user_id: 'bcc-sqlite-test',
      status: 'completed',
      output_summary: 'ok',
    });
    expect(done.run_id).toBe(started.run_id);

    const res = await store.deleteUser('bcc-sqlite-test');
    expect(res).toMatchObject({ deleted: true, workflows_cascade: 1 });
    expect(await store.getWorkflow('bcc-sqlite-test', 'run-flow')).toBeNull();
  });
});
