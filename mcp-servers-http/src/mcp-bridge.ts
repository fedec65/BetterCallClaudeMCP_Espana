#!/usr/bin/env node
/**
 * MCP Bridge — stdio ↔ HTTP
 *
 * Usage: npx tsx mcp-bridge.ts <server-name>
 * Env:   MCP_BASE_URL (default: https://mcp.bettercallclaude.es)
 *
 * Reads JSON-RPC messages from stdin, forwards them via HTTP POST
 * to the remote MCP server, and writes responses to stdout.
 */

import { Readable } from 'node:stream';

const SERVER_NAME = process.argv[2];
const BASE_URL = process.env.MCP_BASE_URL || 'https://mcp.bettercallclaude.es';

if (!SERVER_NAME) {
  console.error('Usage: mcp-bridge.ts <server-name>');
  console.error('Example: mcp-bridge.ts boe-legislacion');
  process.exit(1);
}

const ENDPOINT = `${BASE_URL}/${SERVER_NAME}/mcp`;

async function forwardRequest(body: unknown): Promise<unknown> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function main() {
  const stdin = process.stdin as Readable;
  stdin.setEncoding('utf8');

  let buffer = '';

  stdin.on('data', async (chunk: string) => {
    buffer += chunk;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const message = JSON.parse(trimmed);
        const result = await forwardRequest(message);
        process.stdout.write(JSON.stringify(result) + '\n');
      } catch (err) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32603, message: String(err) },
          }) + '\n',
        );
      }
    }
  });

  stdin.on('end', () => {
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Bridge error:', err);
  process.exit(1);
});
