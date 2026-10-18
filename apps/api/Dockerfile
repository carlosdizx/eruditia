# Se construye desde la raíz del monorepo:
#   docker build -f apps/api/Dockerfile .
FROM node:24-slim

COPY --from=oven/bun:1.4.2 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Incluye devDependencies: las migraciones y seeders corren con ts-node.
RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/api apps/api

WORKDIR /app/apps/api
RUN bun run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
