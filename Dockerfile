### Multi-stage Dockerfile para monorepo (frontend + backend)
FROM node:20-bullseye-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/ .
RUN npm ci --legacy-peer-deps && npm run build

FROM node:20-bullseye-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
COPY backend/ .
# Copia build do frontend para o local esperado pelo backend em tempo de execução
COPY --from=frontend-builder /app/frontend/dist /frontend/dist
# Copia também a árvore de frontend (inclui package.json) para que
# o script `npm --prefix ../frontend run build` do backend encontre os arquivos
COPY --from=frontend-builder /app/frontend /app/frontend

# Instala dependências e builda frontend + backend via script explícito
RUN npm install && npm run build:all && npm prune --production

FROM node:20-bullseye-slim AS runner
WORKDIR /app
# Copia artefatos de runtime
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
# Coloca o frontend build na raiz /frontend/dist (caminho que o backend busca)
COPY --from=frontend-builder /app/frontend/dist /frontend/dist

ENV NODE_ENV=production
EXPOSE 4000
RUN apt-get update && apt-get install -y ca-certificates libssl1.1 || true && rm -rf /var/lib/apt/lists/*
CMD ["node", "dist/index.js"]
