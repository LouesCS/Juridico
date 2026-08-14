# syntax=docker/dockerfile:1

# ---- deps: instala dependências (cache de camada separado do código-fonte)
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts=false

# ---- build: compila TypeScript + gera Prisma Client
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- production: imagem final, sem devDependencies nem código-fonte
FROM node:20-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts=false
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Usuário não-root — reafirma docs/backend/12-docker.md e boas práticas de
# segurança de container (nenhuma etapa anterior exigia isso explicitamente,
# mas é o padrão mínimo aceitável para imagem de produção).
RUN useradd --system --no-create-home appuser
USER appuser

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
