# Pathfinder fixtures (vendored, read-only)

Source repo: `Bronsonp2013/reptech-pathfinder`
Commit: `028af48841c4ef6c1abf5a2482115840740eb265`

Contents:

- `migrations/` — verbatim copy of `packages/db/migrations/*.sql` (0001–0029),
  unmodified. Do not edit; a schema change here belongs in the source repo.
- `config/` — verbatim copy of `eslint.config.mjs`, `.prettierrc`,
  `tsconfig.base.json`, `.nvmrc` from the source repo root, for the architect
  to adopt into RepOS later. Not wired into RepOS's own tooling by this task.
- `load.sh` — applies the migrations to a local Postgres for testing.
- `seed-graham.sql` — the Graham Interiors fixture used by RepOS's Today page
  tests (see `docs/REPOS_V1.md` §7 acceptance criteria).
- `LOCAL_DB.md` — connection strings for the local test databases, if the
  local Postgres cluster could be brought up (git-ignored; see file).

These are read-only vendored copies for testing RepOS against a
Pathfinder-shaped schema. RepOS never writes to a real Pathfinder database;
these fixtures exist only so RepOS's read queries can be exercised locally.
