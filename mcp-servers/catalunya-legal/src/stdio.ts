import { runCatalunyaStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
runCatalunyaStdioServer().catch((err) => { logger.error(err, 'Failed'); process.exit(1); });
