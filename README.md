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

## Documents

- `docs/REPOS_V1.md` — the V1 spec, decisions, and build order
- `docs/SESSION_BRIEF_REPOS_V1.md` — how a build session runs
- `docs/parked/` — the multi-tenant plan this replaced, kept for reentry

## Status

Spec committed; build in progress under orchestration. Skeleton committed:
npm-workspaces monorepo (`apps/api`, `apps/web`, `packages/shared`,
`packages/sources`), API and web contracts, and the test scaffolding for
acceptance criteria C1-C9. Deploy surface is drafted (`Dockerfile`,
`docker-compose.yml`, `Caddyfile.example`, `docs/DEPLOY.md`); the API and web
image have not been built in this environment (no Docker daemon in the
sandbox). `npm run typecheck` and `npm run lint` pass; every test file
exists and fails with `not implemented`. Next: the implementation lanes
(build order B-F in `docs/REPOS_V1.md` §8).
