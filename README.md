# BetterCallClaudeMCP España

Model Context Protocol (MCP) servers for Spanish legal research.

This repository contains the MCP servers that power the Spanish-legal research capabilities of the BetterCallClaude plugin. It follows the same architecture as [BetterCallClaudeMCP](https://github.com/fedec65/BetterCallClaudeMCP) (Swiss) and [BetterCallClaudeMCP_Italy](https://github.com/fedec65/BetterCallClaudeMCP_Italy).

## Production Endpoint

```
https://mcp.bettercallclaude.es
```

## Client Configuration

See [`docs/08-CLIENT-CONFIGURATIONS.md`](docs/08-CLIENT-CONFIGURATIONS.md) for full setup instructions.

Quick start:
- **Claude Desktop (local)**: Copy [`claude-desktop-config.json`](claude-desktop-config.json) to your Claude Desktop config folder
- **Claude Desktop (remote via Railway)**: Copy [`claude-desktop-remote-config.json`](claude-desktop-remote-config.json) (uses the stdio→HTTP bridge)
- **HTTP API**: `POST https://mcp.bettercallclaude.es/<server-name>/mcp`

## Servers

### Tier 1 — Official / Free

| Server | Source | Tools | Endpoint |
|--------|--------|-------|----------|
| `boe-legislacion` | BOE consolidated legislation | 7 | `/boe-legislacion/mcp` |
| `cendoj-jurisprudencia` | CENDOJ court decisions | 3 | `/cendoj-jurisprudencia/mcp` |
| `tribunal-constitucional` | Tribunal Constitucional | 3 | `/tribunal-constitucional/mcp` |
| `eu-law-esp` | EUR-Lex, Curia CJEU | 4 | `/eu-law-esp/mcp` |
| `congreso-debates` | Congreso de los Diputados | 3 | `/congreso-debates/mcp` |
| `legal-citations-esp` | Spanish citation utilities | 6 | `/legal-citations-esp/mcp` |
| `legal-persona-esp` | Document drafting & case analysis | 5 | `/legal-persona-esp/mcp` |

### Tier 3 — Academic & Specialized

| Server | Source | Tools | Endpoint |
|--------|--------|-------|----------|
| `doctrina-academica` | INDRET, Dialnet, IURIS Digital | 2 | `/doctrina-academica/mcp` |
| `derecho-historico` | Gazeta Histórica, CEPC | 3 | `/derecho-historico/mcp` |
| `catalunya-legal` | Projecte Norma Civil (UdG) | 3 | `/catalunya-legal/mcp` |
| `busqueda-general` | Portico Legal, Findiur | 3 | `/busqueda-general/mcp` |

### Tier 4 — Agent Orchestration & Persistence

| Server | Source | Tools | Endpoint |
|--------|--------|-------|----------|
| `workflows-esp` | Workflow store (ADR 0001) | 9 | `/workflows-esp/mcp` |

## Structure

```
mcp-servers/
├── shared/                   # Shared utilities
├── boe-legislacion/          # BOE consolidated legislation
├── cendoj-jurisprudencia/    # CENDOJ court decisions
├── tribunal-constitucional/  # Constitutional Court
├── eu-law-esp/               # EUR-Lex, Curia CJEU
├── congreso-debates/         # Congressional bills & debates
├── legal-citations-esp/      # Citation validator/parser
├── legal-persona-esp/        # Document drafting & case analysis
├── doctrina-academica/       # Academic doctrine
├── derecho-historico/        # Historical legislation
├── catalunya-legal/          # Catalan civil law
├── busqueda-general/         # Generalist portals
└── workflows/                # Persistent workflow store (ADR 0001)

mcp-servers-http/             # Express HTTP aggregator
railway.toml                  # Railway deployment config
```

## Plugin Configuration

Add to your `.mcp.json`:

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

## Development

```bash
npm install
npm run build
npm start
```

## Docker

```bash
docker build -f mcp-servers-http/Dockerfile -t bcc-esp .
docker run --rm -p 3000:3000 bcc-esp
```

## License

AGPL-3.0-or-later
