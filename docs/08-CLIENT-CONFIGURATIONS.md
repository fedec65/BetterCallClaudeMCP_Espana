# Client Configurations — BetterCallClaude España

## Overview

BetterCallClaude España exposes 12 MCP servers via the **official MCP HTTP protocol** (`StreamableHTTPServerTransport`).

Three client configs are provided — pick the one that matches your client:

| Config file | Best for | Approach | Local deps |
|-------------|----------|----------|------------|
| `.mcp.json` | **Cowork Desktop**, Cursor, HTTP-capable clients | `type: "http"` direct | **None** ✅ |
| `claude-desktop-remote-config.json` | Standard Claude Desktop (Railway) | STDIO bridge | `npx tsx` + repo clone |
| `claude-desktop-config.json` | Local development | STDIO local | `npx tsx` + repo clone |

> **For Cowork Desktop users**: use `.mcp.json`. No bridge, no local server, no `npx tsx` needed.

---

## 1. Cowork Desktop / HTTP-capable clients — `.mcp.json` ⭐

If your client supports `type: "http"` (Cowork Desktop, some Cursor versions, custom integrations), this is the simplest option.

Copy `.mcp.json` from the repo root into your client config:

```json
{
  "mcpServers": {
    "boe-legislacion": { "type": "http", "url": "https://mcp.bettercallclaude.es/boe-legislacion/mcp" },
    "cendoj-jurisprudencia": { "type": "http", "url": "https://mcp.bettercallclaude.es/cendoj-jurisprudencia/mcp" },
    "tribunal-constitucional": { "type": "http", "url": "https://mcp.bettercallclaude.es/tribunal-constitucional/mcp" },
    "eu-law-esp": { "type": "http", "url": "https://mcp.bettercallclaude.es/eu-law-esp/mcp" },
    "congreso-debates": { "type": "http", "url": "https://mcp.bettercallclaude.es/congreso-debates/mcp" },
    "legal-citations-esp": { "type": "http", "url": "https://mcp.bettercallclaude.es/legal-citations-esp/mcp" },
    "legal-persona-esp": { "type": "http", "url": "https://mcp.bettercallclaude.es/legal-persona-esp/mcp" },
    "doctrina-academica": { "type": "http", "url": "https://mcp.bettercallclaude.es/doctrina-academica/mcp" },
    "derecho-historico": { "type": "http", "url": "https://mcp.bettercallclaude.es/derecho-historico/mcp" },
    "catalunya-legal": { "type": "http", "url": "https://mcp.bettercallclaude.es/catalunya-legal/mcp" },
    "busqueda-general": { "type": "http", "url": "https://mcp.bettercallclaude.es/busqueda-general/mcp" },
    "workflows-esp": { "type": "http", "url": "https://mcp.bettercallclaude.es/workflows-esp/mcp" }
  }
}
```

**Zero dependencies.** The client connects directly to Railway via HTTP.

---

## 2. Standard Claude Desktop — Local servers

Claude Desktop natively supports MCP only via **stdio** (local processes). Use this if you want to run the servers on your own machine.

### 2.1 Clone and install

```bash
git clone https://github.com/fedec65/BetterCallClaudeMCP_Espana.git
cd BetterCallClaudeMCP_Espana
npm install
```

### 2.2 Config file

Copy to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "boe-legislacion": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/boe-legislacion/src/stdio.ts"]
    },
    "legal-citations-esp": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/legal-citations-esp/src/stdio.ts"]
    },
    "legal-persona-esp": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/legal-persona-esp/src/stdio.ts"]
    },
    "cendoj-jurisprudencia": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/cendoj-jurisprudencia/src/stdio.ts"]
    },
    "tribunal-constitucional": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/tribunal-constitucional/src/stdio.ts"]
    },
    "eu-law-esp": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/eu-law-esp/src/stdio.ts"]
    },
    "congreso-debates": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/congreso-debates/src/stdio.ts"]
    },
    "doctrina-academica": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/doctrina-academica/src/stdio.ts"]
    },
    "derecho-historico": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/derecho-historico/src/stdio.ts"]
    },
    "catalunya-legal": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/catalunya-legal/src/stdio.ts"]
    },
    "busqueda-general": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/busqueda-general/src/stdio.ts"]
    },
    "workflows-esp": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/workflows/src/stdio.ts"],
      "env": { "WORKFLOWS_STORE": "sqlite" }
    }
  }
}
```

> **Note**: If `npx tsx` is not available globally, install it first: `npm install -g tsx`

### 2.3 Restart Claude Desktop

After saving the config, fully quit and reopen Claude Desktop. You should see the tools available in the chat.

---

## 3. Standard Claude Desktop — Remote via Railway (bridge)

If you want to use the Railway deployment from standard Claude Desktop, you need the STDIO bridge because Claude Desktop does not support `type: "http"` natively.

**Requires**: repo cloned, `npm install` done, `npx tsx` available.

```json
{
  "mcpServers": {
    "boe-legislacion": {
      "command": "npx",
      "args": [
        "tsx",
        "mcp-servers-http/src/mcp-bridge.ts",
        "boe-legislacion"
      ],
      "env": {
        "MCP_BASE_URL": "https://mcp.bettercallclaude.es"
      }
    }
  }
}
```

See `claude-desktop-remote-config.json` for the full file with all 12 servers.

---

## 4. Cursor

Cursor supports MCP via the same `claude_desktop_config.json` format. Use the **local** or **bridge** configuration above.

Cursor config location:
- **macOS**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

> Some Cursor builds also support `type: "http"`. If yours does, use `.mcp.json` instead.

---

## 5. Generic HTTP Clients

For custom scripts, LangChain, OpenAI Agents SDK, or any client that speaks MCP HTTP directly:

### 5.1 Initialize handshake

```bash
curl -X POST https://mcp.bettercallclaude.es/boe-legislacion/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "my-client", "version": "1.0" }
    }
  }'
```

**Response** (SSE format):
```
event: message
data: {"jsonrpc":"2.0","id":0,"result":{"protocolVersion":"2024-11-05",...}}
```

Capture the `Mcp-Session-Id` header from the response.

### 5.2 List tools

```bash
curl -X POST https://mcp.bettercallclaude.es/boe-legislacion/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <session-id-from-init>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 5.3 Call a tool

```bash
curl -X POST https://mcp.bettercallclaude.es/boe-legislacion/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <session-id-from-init>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_boe",
      "arguments": { "query": "constitucion", "limit": 5 }
    }
  }'
```

### 5.4 All endpoints

| Server | Endpoint |
|--------|----------|
| BOE Legislación | `POST /boe-legislacion/mcp` |
| CENDOJ Jurisprudencia | `POST /cendoj-jurisprudencia/mcp` |
| Tribunal Constitucional | `POST /tribunal-constitucional/mcp` |
| EU Law ESP | `POST /eu-law-esp/mcp` |
| Congreso Debates | `POST /congreso-debates/mcp` |
| Legal Citations ESP | `POST /legal-citations-esp/mcp` |
| Legal Persona ESP | `POST /legal-persona-esp/mcp` |
| Doctrina Académica | `POST /doctrina-academica/mcp` |
| Derecho Histórico | `POST /derecho-historico/mcp` |
| Catalunya Legal | `POST /catalunya-legal/mcp` |
| Búsqueda General | `POST /busqueda-general/mcp` |
| Workflows ESP | `POST /workflows-esp/mcp` |
| Health check | `GET /health` |

---

## 6. Using the Official MCP SDK Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(
  new StreamableHTTPClientTransport(
    new URL('https://mcp.bettercallclaude.es/boe-legislacion/mcp')
  )
);

const tools = await client.listTools();
const result = await client.callTool({
  name: 'search_boe',
  arguments: { query: 'constitucion', limit: 5 },
});
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP aggregator port |
| `LOG_LEVEL` | `info` | Pino log level |
| `MCP_BASE_URL` | `https://mcp.bettercallclaude.es` | Base URL for the bridge |
| `WORKFLOWS_STORE` | — | workflows-esp provider: `memory` \| `sqlite` \| `postgres` (defaults to `postgres` when `DATABASE_URL` is set, else `memory`) |
| `DATABASE_URL` | — | Postgres connection string for the workflows-esp store (production provider) |
| `WORKFLOWS_SQLITE_PATH` | `workflows-esp.sqlite` | SQLite file path when `WORKFLOWS_STORE=sqlite` (dev-only provider) |
