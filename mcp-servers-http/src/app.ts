import express, { Request, Response } from 'express';
import { logger } from '@bettercallclaude/esp-shared';

export interface McpServerRegistration {
  name: string;
  handler: (req: Request, res: Response) => void | Promise<void>;
}

const servers: McpServerRegistration[] = [];

export function registerMcpServer(server: McpServerRegistration): void {
  servers.push(server);
  logger.info({ server: server.name }, 'Registered MCP server');
}

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      servers: servers.length,
      serverNames: servers.map((s) => s.name),
      timestamp: new Date().toISOString(),
    });
  });

  for (const server of servers) {
    app.post(`/${server.name}/mcp`, server.handler);
    logger.info({ endpoint: `/${server.name}/mcp` }, 'Mounted MCP endpoint');
  }

  return app;
}
