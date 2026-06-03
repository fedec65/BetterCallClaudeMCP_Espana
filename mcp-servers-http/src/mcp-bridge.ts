#!/usr/bin/env node
/**
 * MCP Bridge — Stdio ↔ MCP HTTP (fetch-based, SSE parsing)
 *
 * This bridge uses plain fetch + SSE parsing instead of StreamableHTTPClientTransport
 * to avoid compatibility issues with Railway Edge proxy and SSE persistent connections.
 *
 * Usage: npx tsx mcp-servers-http/src/mcp-bridge.ts <server-name>
 * Env:   MCP_BASE_URL (default: https://mcp.bettercallclaude.es)
 */
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
const endpointUrl = `${baseUrl.replace(/\/$/, '')}/${serverName}/mcp`;

function parseSse(body: string): any[] {
  const events: any[] = [];
  const lines = body.split('\n');
  let currentData: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      currentData = trimmed.slice(6);
    } else if (trimmed === '' && currentData !== null) {
      try {
        events.push(JSON.parse(currentData));
      } catch {
        events.push(currentData);
      }
      currentData = null;
    }
  }
  if (currentData !== null) {
    try {
      events.push(JSON.parse(currentData));
    } catch {
      events.push(currentData);
    }
  }
  return events;
}

async function mcpRequest(body: object, sessionId?: string): Promise<{ response: any; sessionId: string | undefined }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const res = await fetch(endpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP request failed: ${res.status} - ${text}`);
  }

  const newSessionId = res.headers.get('mcp-session-id') || sessionId;
  const text = await res.text();
  const events = parseSse(text);
  if (events.length === 0) {
    throw new Error('No SSE events in response');
  }
  return { response: events[0], sessionId: newSessionId || undefined };
}

async function main() {
  // Initialize remote session
  const { sessionId } = await mcpRequest({
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-bridge', version: '1.0.0' },
    },
  });

  if (!sessionId) {
    throw new Error('No session ID received from remote server');
  }

  // Local server exposed via stdio to Claude Desktop
  const server = new Server(
    { name: serverName, version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const { response } = await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }, sessionId);
    return response.result;
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { response } = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: request.params,
    }, sessionId);
    return response.result;
  });

  const stdio = new StdioServerTransport();
  await server.connect(stdio);
}

main().catch((err) => {
  console.error('Bridge error:', err);
  process.exit(1);
});
