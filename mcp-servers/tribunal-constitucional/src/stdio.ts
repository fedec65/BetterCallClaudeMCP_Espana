import { runTcStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';

runTcStdioServer().catch((err) => {
  logger.error(err, 'Failed to start TC stdio server');
  process.exit(1);
});
