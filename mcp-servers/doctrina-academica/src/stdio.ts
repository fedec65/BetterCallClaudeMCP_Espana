import { runDoctrinaStdioServer } from './server.js';
import { logger } from '@bettercallclaude/esp-shared';
runDoctrinaStdioServer().catch((err) => { logger.error(err, 'Failed'); process.exit(1); });
