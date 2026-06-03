import express, { Application } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from '@bettercallclaude/esp-shared';
import { randomUUID } from 'crypto';

export interface McpServerFactory {
  name: string;
  createServer: () => Server;
}

export async function createApp(servers: McpServerFactory[]): Promise<Application> {
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

  for (const { name, createServer } of servers) {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    await server.connect(transport);

    app.post(`/${name}/mcp`, async (req, res) => {
      try {
        await transport.handleRequest(req, res, req.body);
      } catch (err) {
        logger.error({ err, server: name }, 'MCP transport error');
        if (!res.headersSent) {
          res.status(500).json({ error: String(err) });
        }
      }
    });

    app.get(`/${name}/mcp`, async (req, res) => {
      try {
        await transport.handleRequest(req, res, undefined);
      } catch (err) {
        logger.error({ err, server: name }, 'MCP transport error');
        if (!res.headersSent) {
          res.status(500).json({ error: String(err) });
        }
      }
    });

    logger.info({ endpoint: `/${name}/mcp` }, 'Mounted MCP endpoint');
  }

  return app;
}
