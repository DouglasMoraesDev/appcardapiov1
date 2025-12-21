### Multi-stage Dockerfile para monorepo (frontend + backend)
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/ .
RUN npm ci --legacy-peer-deps && npm run build

FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
COPY backend/ .
# Copia build do frontend para o local esperado pelo backend em tempo de execução
COPY --from=frontend-builder /app/frontend/dist /frontend/dist
# Copia também a árvore de frontend (inclui package.json) para que
# o script `npm --prefix ../frontend run build` do backend encontre os arquivos
COPY --from=frontend-builder /app/frontend /app/frontend

# Instala dependências (incluindo dev para compilação) e builda o backend
# Usar `npm install` aqui porque o repositório pode não conter package-lock.json
RUN npm install && npm run build && npm prune --production

FROM node:18-alpine AS runner
WORKDIR /app
# Copia artefatos de runtime
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
# Coloca o frontend build na raiz /frontend/dist (caminho que o backend busca)
COPY --from=frontend-builder /app/frontend/dist /frontend/dist

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
