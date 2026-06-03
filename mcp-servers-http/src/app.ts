import express, { Application } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from '@bettercallclaude/esp-shared';
import { randomUUID } from 'crypto';

export interface McpServerFactory {
  name: string;
  createServer: () => Server;
}

interface Session {
  server: Server;
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
    const sessions = new Map<string, Session>();

    // Cleanup expired sessions periodically
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TTL_MS) {
          sessions.delete(id);
          session.transport.close().catch(() => {});
          logger.info({ server: name, sessionId: id }, 'Expired MCP session cleaned up');
        }
      }
    }, 60_000);

    const handler = async (req: express.Request, res: express.Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const body = req.body;

      try {
        if (sessionId && sessions.has(sessionId)) {
          // Existing session
          const session = sessions.get(sessionId)!;
          session.lastActivity = Date.now();
          await session.transport.handleRequest(req, res, body);
        } else if (!sessionId && body && body.method === 'initialize') {
          // New session on initialize
          const newSessionId = randomUUID();
          const server = createServer();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
          });
          await server.connect(transport);

          sessions.set(newSessionId, {
            server,
            transport,
            lastActivity: Date.now(),
          });

          await transport.handleRequest(req, res, body);
          logger.info({ server: name, sessionId: newSessionId }, 'New MCP session created');
        } else {
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad Request: valid Mcp-Session-Id or initialize request required' },
            id: body?.id ?? null,
          });
        }
      } catch (err) {
        logger.error({ err, server: name, sessionId }, 'MCP transport error');
        if (!res.headersSent) {
          res.status(500).json({ error: String(err) });
        }
      }
    };

    app.post(`/${name}/mcp`, handler);
    app.get(`/${name}/mcp`, handler);

    logger.info({ endpoint: `/${name}/mcp` }, 'Mounted MCP endpoint');
  }

  return app;
}
