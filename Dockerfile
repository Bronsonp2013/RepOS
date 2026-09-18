# RepOS — single image, two run modes selected by CMD in docker-compose.yml.
#
# RepOS never writes to a source database (CLAUDE.md hard rules). This image
# holds no source credentials; they are supplied at runtime via `.env`
# (REPOS_SOURCE_<SLUG>_DATABASE_URL — see docs/DEPLOY.md and .env.example).
#
# The API runs from source with `tsx` (matches apps/api's own `start`
# script), so there is no API build step. The web app IS built here to a
# static bundle. That bundle can be served two ways:
#   1. By Caddy directly from the built `apps/web/dist` directory on the
#      host/NAS (see Caddyfile.example) — the recommended path, since Caddy
#      already terminates the tailnet site.
#   2. By this same image's `vite preview` server, if you would rather not
#      bind-mount `dist` into Caddy. docker-compose.yml runs the API only;
#      switch its `command` to `web` (see compose comments) to use this mode.
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# --- deps: install once, reused by both the build and the runtime layers ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/sources/package.json packages/sources/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# --- build: type-checked build of the web bundle only ---
FROM deps AS build
COPY . .
RUN npm run build -w apps/web

# --- runtime: everything needed to run the API with tsx, plus the built
#     web bundle for the optional `vite preview` mode ---
FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .
COPY --from=build /app/apps/web/dist ./apps/web/dist

EXPOSE 3200
EXPOSE 5173

# No default CMD: docker-compose.yml sets the API start command explicitly,
# since this image is not meant to be run bare.
CMD ["npm", "run", "start", "-w", "apps/api"]
