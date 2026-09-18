# RepOS — single image; docker-compose.yml runs it as the API service.
#
# RepOS never writes to a source database (CLAUDE.md hard rules). This image
# holds no source credentials; they are supplied at runtime via `.env`
# (REPOS_SOURCE_<SLUG>_DATABASE_URL — see docs/DEPLOY.md and .env.example).
#
# The API runs from source with `tsx` (matches apps/api's own `start`
# script), so there is no API build step. The web app IS built here to a
# static bundle at apps/web/dist. Caddy serves that bundle directly from the
# host — docker-compose.yml mounts the `web-dist` named volume over
# apps/web/dist in this image, which Docker populates from the image's own
# copy on first start, so the built files land on the host without a
# separate build step. See Caddyfile.example and docs/DEPLOY.md.
FROM node:22-slim AS base
WORKDIR /app

# --- deps: install once, reused by both the build and the runtime layers ---
# NODE_ENV is intentionally NOT set to production here: npm ci must install
# devDependencies (tsx, vite, typescript) because the build stage type-checks
# and builds with them, and the runtime stage runs the API with tsx.
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
#     web bundle so the `web-dist` volume mount can be populated from it ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/package.json ./package.json
COPY --chown=node:node . .
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
USER node

EXPOSE 3200

# No default CMD: docker-compose.yml sets the API start command explicitly,
# since this image is not meant to be run bare.
CMD ["npm", "run", "start", "-w", "apps/api"]
