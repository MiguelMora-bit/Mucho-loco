# syntax=docker/dockerfile:1.7
#
# Build desde la RAÍZ del monorepo (no desde apps/backend/), porque
# @mucho-loco/backend es un workspace de pnpm — necesita ver
# pnpm-workspace.yaml y packages/types para instalar/type-check:
#
#   docker build -f apps/backend/Dockerfile -t mucho-loco-backend .
#
# @mucho-loco/types es SOLO devDependency (todo import es `import type`, se
# borra al compilar) — necesaria para que tsc compile, no para correr.
#
# Simplificación deliberada: la imagen final SÍ carga devDependencies (no se
# podó a --prod aparte). Separar un node_modules "solo prod" de uno "con
# Prisma ya generado" en dos instalaciones independientes de pnpm resultó
# más frágil que el beneficio (imagen más chica) justificaba para el tamaño
# de este servicio — revisar si esto se vuelve un problema real de tamaño/
# superficie de ataque antes de complicar el Dockerfile por esto.

ARG NODE_VERSION=22-alpine

# ---------- deps: todo (dev+prod) para poder compilar ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json packages/types/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile --filter @mucho-loco/backend...

# ---------- build: prisma generate + tsc ----------
FROM node:${NODE_VERSION} AS build
WORKDIR /repo
RUN corepack enable
# Sin esto, corepack no encuentra el campo "packageManager" (vive en el
# package.json raíz) y descarga la última versión de pnpm en vez de la fijada.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY packages/types packages/types
COPY apps/backend apps/backend
RUN pnpm --filter @mucho-loco/backend exec prisma generate
RUN pnpm --filter @mucho-loco/backend build

# ---------- runtime: imagen final ----------
FROM node:${NODE_VERSION} AS runtime
# dumb-init reenvía SIGTERM correctamente al proceso node — sin esto, un
# `docker stop`/despliegue en ECS Fargate mata el contenedor a la fuerza tras
# el timeout en vez de dejar que Nest cierre conexiones (ver PrismaService.onModuleDestroy).
# util-linux trae `script`, que el agente de ECS Exec necesita para abrir el
# pseudo-terminal de `aws ecs execute-command` — sin él, la sesión interactiva
# muere con "unable to generate log data" (Alpine no lo trae por default).
RUN apk add --no-cache dumb-init util-linux
WORKDIR /app
ENV NODE_ENV=production
# La cadena opera en CDMX y hay lógica que depende de qué día es "hoy" en la
# sucursal (asistencia del equipo, agrupación por día de los reportes). Sin
# esto el contenedor corre en UTC y a partir de las 18:00 locales el gerente
# vería el día siguiente.
ENV TZ=America/Mexico_City
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
# `prisma migrate deploy`/`prisma db seed` (corridos a mano vía ECS Exec, ver
# infra/README.md) buscan schema.prisma + migrations/ en disco — dist/ no los
# trae porque tsc solo compila código, no copia este directorio.
COPY --from=build /repo/apps/backend/prisma ./apps/backend/prisma
# La imagen base "node:*-alpine" ya trae un usuario "node" (uid 1000) sin privilegios.
USER node
EXPOSE 3000
# wget viene con busybox en alpine — evita instalar curl solo para esto.
# ECS Fargate puede reusar este HEALTHCHECK o definir el suyo propio en el
# task definition; tenerlo aquí sirve igual para `docker ps`/Compose en local.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
# dist/src/, no dist/ — tsconfig.json no fija rootDir a "src", así que tsc
# conserva la carpeta fuente dentro de dist/ (ver nest-cli.json, sourceRoot).
CMD ["node", "apps/backend/dist/src/main.js"]
