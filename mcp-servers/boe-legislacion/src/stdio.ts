import { runBoeStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';

runBoeStdioServer().catch((err) => {
  logger.error(err, 'Failed to start BOE stdio server');
  process.exit(1);
});
