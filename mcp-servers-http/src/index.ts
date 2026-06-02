import { createApp, registerMcpServer } from './app.js';
import { logger } from '@bettercallclaude/esp-shared';
import { createBoeLegislacionHttpHandler } from '@bettercallclaude/esp-boe-legislacion';
import { createLegalCitationsHttpHandler } from '@bettercallclaude/esp-legal-citations';
import { createLegalPersonaHttpHandler } from '@bettercallclaude/esp-legal-persona';
import { createEuLawHttpHandler } from '@bettercallclaude/esp-eu-law';
import { createCendojHttpHandler } from '@bettercallclaude/esp-cendoj-jurisprudencia';
import { createTcHttpHandler } from '@bettercallclaude/esp-tribunal-constitucional';
import { createCongresoHttpHandler } from '@bettercallclaude/esp-congreso-debates';
import { createDoctrinaHttpHandler } from '@bettercallclaude/esp-doctrina-academica';
import { createHistoricoHttpHandler } from '@bettercallclaude/esp-derecho-historico';
import { createCatalunyaHttpHandler } from '@bettercallclaude/esp-catalunya-legal';
import { createBusquedaHttpHandler } from '@bettercallclaude/esp-busqueda-general';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Tier 1 — Official / Free
registerMcpServer({ name: 'boe-legislacion', handler: createBoeLegislacionHttpHandler() });
registerMcpServer({ name: 'cendoj-jurisprudencia', handler: createCendojHttpHandler() });
registerMcpServer({ name: 'tribunal-constitucional', handler: createTcHttpHandler() });
registerMcpServer({ name: 'eu-law-esp', handler: createEuLawHttpHandler() });
registerMcpServer({ name: 'congreso-debates', handler: createCongresoHttpHandler() });
registerMcpServer({ name: 'legal-citations-esp', handler: createLegalCitationsHttpHandler() });
registerMcpServer({ name: 'legal-persona-esp', handler: createLegalPersonaHttpHandler() });

// Tier 3 — Academic & Specialized
registerMcpServer({ name: 'doctrina-academica', handler: createDoctrinaHttpHandler() });
registerMcpServer({ name: 'derecho-historico', handler: createHistoricoHttpHandler() });
registerMcpServer({ name: 'catalunya-legal', handler: createCatalunyaHttpHandler() });
registerMcpServer({ name: 'busqueda-general', handler: createBusquedaHttpHandler() });

const app = createApp();

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'BetterCallClaude España MCP HTTP aggregator started');
});
