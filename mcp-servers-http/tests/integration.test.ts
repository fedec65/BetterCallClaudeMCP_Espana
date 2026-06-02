import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, registerMcpServer } from '../src/app.js';
import { createBoeLegislacionHttpHandler } from '@bettercallclaude/esp-boe-legislacion';
import { createLegalCitationsHttpHandler } from '@bettercallclaude/esp-legal-citations';
import { createLegalPersonaHttpHandler } from '@bettercallclaude/esp-legal-persona';
import type { Application } from 'express';

let app: Application;

beforeAll(() => {
  registerMcpServer({ name: 'boe-legislacion', handler: createBoeLegislacionHttpHandler() });
  registerMcpServer({ name: 'legal-citations-esp', handler: createLegalCitationsHttpHandler() });
  registerMcpServer({ name: 'legal-persona-esp', handler: createLegalPersonaHttpHandler() });
  app = createApp();
});

describe('HTTP Aggregator', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.servers).toBeGreaterThanOrEqual(3);
    expect(response.body.serverNames).toContain('boe-legislacion');
  });

  it('should list tools for boe-legislacion', async () => {
    const response = await request(app)
      .post('/boe-legislacion/mcp')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(response.status).toBe(200);
    expect(response.body.result.tools).toBeInstanceOf(Array);
    expect(response.body.result.tools.length).toBeGreaterThanOrEqual(1);
    const toolNames = response.body.result.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain('search_boe');
  });

  it('should list tools for legal-citations-esp', async () => {
    const response = await request(app)
      .post('/legal-citations-esp/mcp')
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(response.status).toBe(200);
    expect(response.body.result.tools).toBeInstanceOf(Array);
    const toolNames = response.body.result.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain('validate_citation');
    expect(toolNames).toContain('parse_citation');
  });

  it('should call parse_citation tool', async () => {
    const response = await request(app)
      .post('/legal-citations-esp/mcp')
      .send({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'parse_citation', arguments: { citation: 'BOE-A-2015-10566' } },
      });
    expect(response.status).toBe(200);
    expect(response.body.result.content).toBeInstanceOf(Array);
    const text = JSON.parse(response.body.result.content[0].text);
    expect(text.type).toBe('boe');
    expect(text.isValid).toBe(true);
  });

  it('should return error for unknown method', async () => {
    const response = await request(app)
      .post('/boe-legislacion/mcp')
      .send({ jsonrpc: '2.0', id: 4, method: 'unknown_method' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
