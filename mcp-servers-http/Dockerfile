# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./

# Copy all workspace package.json files first for layer caching
COPY mcp-servers/shared/package*.json mcp-servers/shared/
COPY mcp-servers/boe-legislacion/package*.json mcp-servers/boe-legislacion/
COPY mcp-servers/cendoj-jurisprudencia/package*.json mcp-servers/cendoj-jurisprudencia/
COPY mcp-servers/tribunal-constitucional/package*.json mcp-servers/tribunal-constitucional/
COPY mcp-servers/eu-law-esp/package*.json mcp-servers/eu-law-esp/
COPY mcp-servers/congreso-debates/package*.json mcp-servers/congreso-debates/
COPY mcp-servers/legal-citations-esp/package*.json mcp-servers/legal-citations-esp/
COPY mcp-servers/legal-persona-esp/package*.json mcp-servers/legal-persona-esp/
COPY mcp-servers/doctrina-academica/package*.json mcp-servers/doctrina-academica/
COPY mcp-servers/derecho-historico/package*.json mcp-servers/derecho-historico/
COPY mcp-servers/catalunya-legal/package*.json mcp-servers/catalunya-legal/
COPY mcp-servers/busqueda-general/package*.json mcp-servers/busqueda-general/
COPY mcp-servers/workflows/package*.json mcp-servers/workflows/
COPY mcp-servers-http/package*.json mcp-servers-http/

RUN npm ci

# Copy tsconfig files
COPY mcp-servers/shared/tsconfig.json mcp-servers/shared/
COPY mcp-servers/boe-legislacion/tsconfig.json mcp-servers/boe-legislacion/
COPY mcp-servers/cendoj-jurisprudencia/tsconfig.json mcp-servers/cendoj-jurisprudencia/
COPY mcp-servers/tribunal-constitucional/tsconfig.json mcp-servers/tribunal-constitucional/
COPY mcp-servers/eu-law-esp/tsconfig.json mcp-servers/eu-law-esp/
COPY mcp-servers/congreso-debates/tsconfig.json mcp-servers/congreso-debates/
COPY mcp-servers/legal-citations-esp/tsconfig.json mcp-servers/legal-citations-esp/
COPY mcp-servers/legal-persona-esp/tsconfig.json mcp-servers/legal-persona-esp/
COPY mcp-servers/doctrina-academica/tsconfig.json mcp-servers/doctrina-academica/
COPY mcp-servers/derecho-historico/tsconfig.json mcp-servers/derecho-historico/
COPY mcp-servers/catalunya-legal/tsconfig.json mcp-servers/catalunya-legal/
COPY mcp-servers/busqueda-general/tsconfig.json mcp-servers/busqueda-general/
COPY mcp-servers/workflows/tsconfig.json mcp-servers/workflows/
COPY mcp-servers-http/tsconfig.json mcp-servers-http/

# Copy source code
COPY mcp-servers/shared/src mcp-servers/shared/src
COPY mcp-servers/boe-legislacion/src mcp-servers/boe-legislacion/src
COPY mcp-servers/cendoj-jurisprudencia/src mcp-servers/cendoj-jurisprudencia/src
COPY mcp-servers/tribunal-constitucional/src mcp-servers/tribunal-constitucional/src
COPY mcp-servers/eu-law-esp/src mcp-servers/eu-law-esp/src
COPY mcp-servers/congreso-debates/src mcp-servers/congreso-debates/src
COPY mcp-servers/legal-citations-esp/src mcp-servers/legal-citations-esp/src
COPY mcp-servers/legal-persona-esp/src mcp-servers/legal-persona-esp/src
COPY mcp-servers/doctrina-academica/src mcp-servers/doctrina-academica/src
COPY mcp-servers/derecho-historico/src mcp-servers/derecho-historico/src
COPY mcp-servers/catalunya-legal/src mcp-servers/catalunya-legal/src
COPY mcp-servers/busqueda-general/src mcp-servers/busqueda-general/src
COPY mcp-servers/workflows/src mcp-servers/workflows/src
COPY mcp-servers-http/src mcp-servers-http/src

# Build shared first (other workspaces depend on it)
RUN npm run build -w mcp-servers/shared
RUN npm run build --workspaces

# Production stage
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/mcp-servers/shared/dist mcp-servers/shared/dist
COPY --from=builder /app/mcp-servers/boe-legislacion/dist mcp-servers/boe-legislacion/dist
COPY --from=builder /app/mcp-servers/cendoj-jurisprudencia/dist mcp-servers/cendoj-jurisprudencia/dist
COPY --from=builder /app/mcp-servers/tribunal-constitucional/dist mcp-servers/tribunal-constitucional/dist
COPY --from=builder /app/mcp-servers/eu-law-esp/dist mcp-servers/eu-law-esp/dist
COPY --from=builder /app/mcp-servers/congreso-debates/dist mcp-servers/congreso-debates/dist
COPY --from=builder /app/mcp-servers/legal-citations-esp/dist mcp-servers/legal-citations-esp/dist
COPY --from=builder /app/mcp-servers/legal-persona-esp/dist mcp-servers/legal-persona-esp/dist
COPY --from=builder /app/mcp-servers/doctrina-academica/dist mcp-servers/doctrina-academica/dist
COPY --from=builder /app/mcp-servers/derecho-historico/dist mcp-servers/derecho-historico/dist
COPY --from=builder /app/mcp-servers/catalunya-legal/dist mcp-servers/catalunya-legal/dist
COPY --from=builder /app/mcp-servers/busqueda-general/dist mcp-servers/busqueda-general/dist
COPY --from=builder /app/mcp-servers/workflows/dist mcp-servers/workflows/dist
COPY --from=builder /app/mcp-servers-http/dist mcp-servers-http/dist
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/mcp-servers/shared/package*.json mcp-servers/shared/
COPY --from=builder /app/mcp-servers/boe-legislacion/package*.json mcp-servers/boe-legislacion/
COPY --from=builder /app/mcp-servers/cendoj-jurisprudencia/package*.json mcp-servers/cendoj-jurisprudencia/
COPY --from=builder /app/mcp-servers/tribunal-constitucional/package*.json mcp-servers/tribunal-constitucional/
COPY --from=builder /app/mcp-servers/eu-law-esp/package*.json mcp-servers/eu-law-esp/
COPY --from=builder /app/mcp-servers/congreso-debates/package*.json mcp-servers/congreso-debates/
COPY --from=builder /app/mcp-servers/legal-citations-esp/package*.json mcp-servers/legal-citations-esp/
COPY --from=builder /app/mcp-servers/legal-persona-esp/package*.json mcp-servers/legal-persona-esp/
COPY --from=builder /app/mcp-servers/doctrina-academica/package*.json mcp-servers/doctrina-academica/
COPY --from=builder /app/mcp-servers/derecho-historico/package*.json mcp-servers/derecho-historico/
COPY --from=builder /app/mcp-servers/catalunya-legal/package*.json mcp-servers/catalunya-legal/
COPY --from=builder /app/mcp-servers/busqueda-general/package*.json mcp-servers/busqueda-general/
COPY --from=builder /app/mcp-servers/workflows/package*.json mcp-servers/workflows/
COPY --from=builder /app/mcp-servers-http/package*.json mcp-servers-http/

EXPOSE 3000
CMD ["node", "mcp-servers-http/dist/index.js"]
