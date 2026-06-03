import { createApp } from './app.js';
import { logger } from '@bettercallclaude/esp-shared';
import { createBoeServer } from '@bettercallclaude/esp-boe-legislacion';
import { createCitationsServer } from '@bettercallclaude/esp-legal-citations';
import { createPersonaServer } from '@bettercallclaude/esp-legal-persona';
import { createEuLawServer } from '@bettercallclaude/esp-eu-law';
import { createCendojServer } from '@bettercallclaude/esp-cendoj-jurisprudencia';
import { createTcServer } from '@bettercallclaude/esp-tribunal-constitucional';
import { createCongresoServer } from '@bettercallclaude/esp-congreso-debates';
import { createDoctrinaServer } from '@bettercallclaude/esp-doctrina-academica';
import { createHistoricoServer } from '@bettercallclaude/esp-derecho-historico';
import { createCatalunyaServer } from '@bettercallclaude/esp-catalunya-legal';
import { createBusquedaServer } from '@bettercallclaude/esp-busqueda-general';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const servers = [
  { name: 'boe-legislacion', createServer: createBoeServer },
  { name: 'cendoj-jurisprudencia', createServer: createCendojServer },
  { name: 'tribunal-constitucional', createServer: createTcServer },
  { name: 'eu-law-esp', createServer: createEuLawServer },
  { name: 'congreso-debates', createServer: createCongresoServer },
  { name: 'legal-citations-esp', createServer: createCitationsServer },
  { name: 'legal-persona-esp', createServer: createPersonaServer },
  { name: 'doctrina-academica', createServer: createDoctrinaServer },
  { name: 'derecho-historico', createServer: createHistoricoServer },
  { name: 'catalunya-legal', createServer: createCatalunyaServer },
  { name: 'busqueda-general', createServer: createBusquedaServer },
];

async function main() {
  const app = await createApp(servers);

  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'BetterCallClaude España MCP HTTP aggregator started');
  });
}

main().catch((err) => {
  logger.error(err, 'Failed to start HTTP aggregator');
  process.exit(1);
});
