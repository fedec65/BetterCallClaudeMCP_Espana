import { runHistoricoStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
runHistoricoStdioServer().catch((err) => { logger.error(err, 'Failed'); process.exit(1); });
