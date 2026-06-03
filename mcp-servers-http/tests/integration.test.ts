import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../src/app.js';
import { createBoeServer } from '@bettercallclaude/esp-boe-legislacion';
import { createCitationsServer } from '@bettercallclaude/esp-legal-citations';
import { createBusquedaServer } from '@bettercallclaude/esp-busqueda-general';

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

async function mcpRequest(
  app: Application,
  endpoint: string,
  body: object,
  sessionId?: string
): Promise<{ response: any; sessionId: string | undefined }> {
  const req = request(app)
    .post(endpoint)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream')
    .send(body);

  if (sessionId) {
    req.set('Mcp-Session-Id', sessionId);
  }

  const res = await req;

  if (res.status !== 200) {
    throw new Error(`MCP request failed: ${res.status} - ${res.text}`);
  }

  const newSessionId = res.headers['mcp-session-id'] as string | undefined;
  const events = parseSse(res.text);
  if (events.length === 0) {
    throw new Error('No SSE events in response');
  }
  return { response: events[0], sessionId: newSessionId || sessionId };
}

describe('MCP HTTP Server', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createApp([
      { name: 'boe-legislacion', createServer: createBoeServer },
      { name: 'legal-citations', createServer: createCitationsServer },
      { name: 'busqueda-general', createServer: createBusquedaServer },
    ]);
  });

  it('health endpoint returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.servers).toBe(3);
  });

  it('boe-legislacion: initialize + list tools', async () => {
    const { response, sessionId } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });
    expect(response.result).toBeDefined();
    expect(response.result.protocolVersion).toBe('2024-11-05');
    expect(sessionId).toBeDefined();

    const { response: listRes } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }, sessionId);
    expect(listRes.result).toBeDefined();
    const tools = listRes.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.map((t: any) => t.name)).toContain('search_boe');
  });

  it('boe-legislacion: call search_boe tool', async () => {
    const { sessionId } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });

    const { response } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_boe',
        arguments: { query: 'constitucion', limit: 1 },
      },
    }, sessionId);
    expect(response.result).toBeDefined();
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
  });

  it('legal-citations: initialize + list tools', async () => {
    const { response, sessionId } = await mcpRequest(app, '/legal-citations/mcp', {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });
    expect(sessionId).toBeDefined();

    const { response: listRes } = await mcpRequest(app, '/legal-citations/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }, sessionId);
    expect(listRes.result).toBeDefined();
    const tools = listRes.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.map((t: any) => t.name)).toContain('validate_citation');
  });

  it('busqueda-general: initialize + list tools', async () => {
    const { response, sessionId } = await mcpRequest(app, '/busqueda-general/mcp', {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });
    expect(sessionId).toBeDefined();

    const { response: listRes } = await mcpRequest(app, '/busqueda-general/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }, sessionId);
    expect(listRes.result).toBeDefined();
    const tools = listRes.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.map((t: any) => t.name)).toContain('search_portico');
  });

  it('404 for unknown server', async () => {
    const res = await request(app).post('/unknown/mcp');
    expect(res.status).toBe(404);
  });

  it('multiple clients can initialize independently', async () => {
    const { sessionId: sid1 } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'client-1', version: '1.0' },
      },
    });

    const { sessionId: sid2 } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'client-2', version: '1.0' },
      },
    });

    expect(sid1).toBeDefined();
    expect(sid2).toBeDefined();
    expect(sid1).not.toBe(sid2);

    // Both clients can list tools
    const { response: r1 } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0', id: 1, method: 'tools/list',
    }, sid1);
    expect(r1.result.tools.length).toBeGreaterThan(0);

    const { response: r2 } = await mcpRequest(app, '/boe-legislacion/mcp', {
      jsonrpc: '2.0', id: 1, method: 'tools/list',
    }, sid2);
    expect(r2.result.tools.length).toBeGreaterThan(0);
  });
});
