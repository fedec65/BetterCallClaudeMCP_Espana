import { runPersonaStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';

runPersonaStdioServer().catch((err) => {
  logger.error(err, 'Failed to start Legal Persona stdio server');
  process.exit(1);
});
