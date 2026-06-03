#!/usr/bin/env node
/**
 * MCP Bridge — Stdio ↔ Official MCP HTTP (StreamableHTTPClientTransport)
 *
 * Usage: npx tsx mcp-servers-http/src/mcp-bridge.ts <server-name>
 * Env:   MCP_BASE_URL (default: https://mcp.bettercallclaude.es)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const serverName = process.argv[2];
if (!serverName) {
  console.error('Usage: mcp-bridge.ts <server-name>');
  process.exit(1);
}

const baseUrl = process.env.MCP_BASE_URL || 'https://mcp.bettercallclaude.es';
const endpointUrl = new URL(`/${serverName}/mcp`, baseUrl);

async function main() {
  // Remote client using official MCP HTTP transport
  const client = new Client(
    { name: 'mcp-bridge', version: '1.0.0' },
    { capabilities: {} }
  );
  const httpTransport = new StreamableHTTPClientTransport(endpointUrl);
  await client.connect(httpTransport);

  // Local server exposed via stdio to Claude Desktop
  const server = new Server(
    { name: serverName, version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return await client.listTools();
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return await client.callTool(request.params);
  });

  const stdio = new StdioServerTransport();
  await server.connect(stdio);
}

main().catch((err) => {
  console.error('Bridge error:', err);
  process.exit(1);
});
