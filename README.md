# RepOS

**RepOS** is the operating system for a rep who runs more than one venture. It
is one read-only screen over every venture's own
[Pathfinder](https://github.com/Bronsonp2013/reptech-pathfinder) instance:
what needs a visit, what trips are coming, where the pipeline stands, how
coverage is tracking.

RepOS never writes. Every action happens in the Pathfinder instance that owns
the data. RepOS deep-links there.

## Ventures

| Slug | Kind | Pathfinder instance |
| --- | --- | --- |
| `lexington` | territory | Bronson's Lexington Home Brands book, TX / OK / AR / LA |
| `pathfinder` | venture | Selling Pathfinder itself: reps as prospects, trials, paying seats |

Adding a venture is a new entry in `sources.json` and a read-only database
role. See `docs/REPOS_V1.md` §3 and §6.

## Principles

1. **Read-only by construction.** The database role can only `SELECT`, and
   every connection is a read-only transaction. A bug in RepOS cannot damage
   a venture's data.
2. **Physical separation.** Ventures are separate databases, not rows with a
   tag. Nothing has to check a tag.
3. **Pathfinder is unchanged.** RepOS adapts to Pathfinder's schema, not the
   other way around, and says loudly when the schema moves.

## Running

```
cp .env.example .env   # fill in each REPOS_SOURCE_<SLUG>_DATABASE_URL
npm install
npm run dev             # API on :3200, web on :5173, both reading .env
```

`npm run dev` runs `apps/api` and `apps/web` together. `apps/web`'s Vite dev
server loads `.env` on its own; `apps/api` loads it explicitly in
`apps/api/src/index.ts` (tsx does not do this automatically).

## Documents

- `docs/REPOS_V1.md` — the V1 spec, decisions, and build order
- `docs/SESSION_BRIEF_REPOS_V1.md` — how a build session runs
- `docs/parked/` — the multi-tenant plan this replaced, kept for reentry

## Status

V1 built and under review. All implementation lanes (sources, blocks, routes,
web, deploy-docs) have landed and been integrated. `npm run typecheck`,
`npm run lint`, `npm test`, `npm run build -w apps/web`, and `npm run e2e`
all pass. `npm run dev` starts the API and web app together against `.env`.
Deploy surface is drafted (`Dockerfile`, `docker-compose.yml`,
`Caddyfile.example`, `docs/DEPLOY.md`); the container image has not been
built in this environment (no Docker daemon in the sandbox). Next: review
against the acceptance criteria in `.orchestrator/state.md`.
