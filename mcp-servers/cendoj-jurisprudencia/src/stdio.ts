import { runCendojStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';

runCendojStdioServer().catch((err) => {
  logger.error(err, 'Failed to start CENDOJ stdio server');
  process.exit(1);
});
