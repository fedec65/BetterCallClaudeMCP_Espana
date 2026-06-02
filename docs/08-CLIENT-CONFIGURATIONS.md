# Client Configurations — BetterCallClaude España

## Overview

BetterCallClaude España exposes 11 MCP servers via HTTP POST endpoints. The protocol is JSON-RPC 2.0 compatible.

Two usage modes are supported:

1. **Remote (Railway)** — Connect to `https://mcp.bettercallclaude.es` from any HTTP-capable client
2. **Local** — Clone the repo and run servers directly (required for Claude Desktop)

---

## Claude Desktop (macOS / Windows / Linux)

Claude Desktop natively supports MCP only via **stdio** (local processes). To connect to the remote Railway deployment, use the **MCP HTTP Bridge** (see below). To run locally:

### 1. Clone and install

```bash
git clone https://github.com/fedec65/BetterCallClaudeMCP_Espana.git
cd BetterCallClaudeMCP_Espana
npm install
```

### 2. Claude Desktop config

Copy this to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "boe-legislacion": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/boe-legislacion/src/server.ts"]
    },
    "legal-citations-esp": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/legal-citations-esp/src/server.ts"]
    },
    "legal-persona-esp": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/legal-persona-esp/src/server.ts"]
    },
    "cendoj-jurisprudencia": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/cendoj-jurisprudencia/src/server.ts"]
    },
    "tribunal-constitucional": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/tribunal-constitucional/src/server.ts"]
    },
    "eu-law-esp": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/eu-law-esp/src/server.ts"]
    },
    "congreso-debates": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/congreso-debates/src/server.ts"]
    },
    "doctrina-academica": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/doctrina-academica/src/server.ts"]
    },
    "derecho-historico": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/derecho-historico/src/server.ts"]
    },
    "catalunya-legal": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/catalunya-legal/src/server.ts"]
    },
    "busqueda-general": {
      "command": "npx",
      "args": ["tsx", "mcp-servers/busqueda-general/src/server.ts"]
    }
  }
}
```

> **Note**: If `npx tsx` is not available globally, install it first: `npm install -g tsx`

### 3. Restart Claude Desktop

After saving the config, fully quit and reopen Claude Desktop. You should see the tools available in the chat.

---

## Claude Desktop → Railway (Remote via Bridge)

To use the Railway deployment from Claude Desktop, run the bridge script:

```bash
npx tsx mcp-servers-http/src/mcp-bridge.ts <server-name>
```

Example config:

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

See `mcp-servers-http/src/mcp-bridge.ts` for the bridge implementation.

---

## Cursor

Cursor supports MCP via the same `claude_desktop_config.json` format. Use either the **local** or **bridge** configuration above.

Cursor config location:
- **macOS**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

---

## Generic HTTP Clients

For clients that support HTTP endpoints directly (OpenAI Agents, LangChain, custom integrations):

### List tools

```bash
curl -X POST https://mcp.bettercallclaude.es/boe-legislacion/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Call a tool

```bash
curl -X POST https://mcp.bettercallclaude.es/boe-legislacion/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_boe",
      "arguments": {
        "q": "constitucion"
      }
    }
  }'
```

### All endpoints

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
| Health check | `GET /health` |

---

## Environment Variables

When running locally:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP aggregator port |
| `LOG_LEVEL` | `info` | Pino log level |
| `MCP_BASE_URL` | — | Base URL for the bridge |
