import { runEuLawStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';

runEuLawStdioServer().catch((err) => {
  logger.error(err, 'Failed to start EU Law stdio server');
  process.exit(1);
});
