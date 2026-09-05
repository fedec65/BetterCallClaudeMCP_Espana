import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '@bettercallclaude/esp-shared';
import { createWorkflowsServer } from './server.js';
import { resolveStore } from './store-factory.js';

/**
 * Stdio entry point (used by `claude-desktop-config.json` for local dev):
 * resolves the process-wide store (env: WORKFLOWS_STORE / DATABASE_URL /
 * WORKFLOWS_SQLITE_PATH) and serves workflows-esp over stdio.
 */
async function main(): Promise<void> {
  const store = await resolveStore();
  const server = createWorkflowsServer({ store });
  await server.connect(new StdioServerTransport());
  logger.info('workflows-esp MCP server running on stdio');
}

main().catch((err) => {
  logger.error(err, 'Failed to start workflows-esp stdio server');
  process.exit(1);
});
