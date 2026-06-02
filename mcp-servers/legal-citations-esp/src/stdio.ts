import { runCitationsStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';

runCitationsStdioServer().catch((err) => {
  logger.error(err, 'Failed to start Legal Citations stdio server');
  process.exit(1);
});
