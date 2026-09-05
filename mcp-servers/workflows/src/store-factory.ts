import { logger } from '@bettercallclaude/esp-shared';
import type { WorkflowStore } from './store.js';
import { InMemoryWorkflowStore } from './store-memory.js';
import { PostgresWorkflowStore } from './store-postgres.js';
import { openSqliteWorkflowStore } from './store-sqlite.js';

/**
 * Store providers selectable via `WORKFLOWS_STORE`.
 * - `postgres` — production (ADR §2): Railway Postgres via `DATABASE_URL`.
 * - `sqlite`   — explicit dev-only provider (ADR §2 rejects SQLite in prod).
 * - `memory`   — fallback / tests; not persistent.
 */
export type StoreProvider = 'memory' | 'sqlite' | 'postgres';

export const SQLITE_DEFAULT_PATH = 'workflows-esp.sqlite';

let cachedStore: WorkflowStore | null = null;

/**
 * Resolve the process-wide `WorkflowStore` singleton.
 *
 * The HTTP aggregator creates one MCP `Server` per session, so the store must
 * be created **once per process** and closed over by the server factory —
 * per-session stores would exhaust the Postgres pool.
 *
 * Selection order:
 * 1. `WORKFLOWS_STORE` env if set to a known provider.
 * 2. `postgres` when `DATABASE_URL` is set.
 * 3. `memory` otherwise.
 */
export async function resolveStore(): Promise<WorkflowStore> {
  if (cachedStore) return cachedStore;

  const requested = process.env.WORKFLOWS_STORE;
  let provider: StoreProvider;
  if (requested && ['memory', 'sqlite', 'postgres'].includes(requested)) {
    provider = requested as StoreProvider;
  } else if (requested) {
    throw new Error(
      `WORKFLOWS_STORE="${requested}" is not a valid provider; expected memory|sqlite|postgres`,
    );
  } else if (process.env.DATABASE_URL) {
    provider = 'postgres';
  } else {
    provider = 'memory';
  }

  let store: WorkflowStore;
  switch (provider) {
    case 'postgres':
      store = new PostgresWorkflowStore();
      break;
    case 'sqlite': {
      const path = process.env.WORKFLOWS_SQLITE_PATH ?? SQLITE_DEFAULT_PATH;
      store = await openSqliteWorkflowStore(path);
      break;
    }
    case 'memory':
    default:
      store = new InMemoryWorkflowStore();
      break;
  }

  cachedStore = store;
  logger.info(
    { provider },
    provider === 'sqlite'
      ? `workflows-esp store resolved: ${provider} (path ${process.env.WORKFLOWS_SQLITE_PATH ?? SQLITE_DEFAULT_PATH})`
      : provider === 'postgres'
        ? 'workflows-esp store resolved: postgres (DATABASE_URL)'
        : 'workflows-esp store resolved: memory (no DATABASE_URL / WORKFLOWS_STORE) — data is NOT persistent',
  );
  return store;
}

/** Test/teardown helper: drop the cached singleton. */
export function resetStoreForTests(): void {
  cachedStore = null;
}
