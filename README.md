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

`npm run e2e` resolves Chromium via `REPOS_E2E_CHROMIUM_PATH` if set, else
Playwright's own installed default, else the fallback under `/opt/pw-browsers`.

## Documents

- `docs/REPOS_V1.md` — the V1 spec, decisions, and build order
- `docs/SESSION_BRIEF_REPOS_V1.md` — how a build session runs
- `docs/parked/` — the multi-tenant plan this replaced, kept for reentry

## Status

V1 was built and accepted on 2026-09-18, then independently reviewed by five
review lenses (data correctness, concurrency and failure modes, security,
web UX and accessibility, deploy and docs) with 40 verified findings fixed
and re-accepted the same day (typecheck, lint, 63 tests, web build, and
Playwright e2e all passing). What remains before real use: create the
`repos_reader` role on the Lexington database, stand up the second
Pathfinder instance, set real `webUrl` values in `sources.json`, and deploy
per `docs/DEPLOY.md`.
