import { runBusquedaStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
runBusquedaStdioServer().catch((err) => { logger.error(err, 'Failed'); process.exit(1); });
