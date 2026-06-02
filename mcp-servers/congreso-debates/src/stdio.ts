import { runCongresoStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';

runCongresoStdioServer().catch((err) => {
  logger.error(err, 'Failed to start Congreso stdio server');
  process.exit(1);
});
