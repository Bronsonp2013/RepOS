# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

RepOS is a read-only operating shell over one or more Pathfinder instances
(`Bronsonp2013/reptech-pathfinder`), one per venture. It reads each venture's
database with a `SELECT`-only role and renders a single Today page. It never
writes to any source. Spec: `docs/REPOS_V1.md`.

## Hard rules

- **No writable credential, ever.** RepOS holds only `repos_reader`
  connection strings. If a task appears to need a write, stop and raise it;
  the answer is a Pathfinder-side change or a parked reentry point.
- **Pathfinder is never modified from this repo.** Read it for schema and
  conventions. Changes to it are a separate session in that repo.
- **Schema coupling is declared.** The Pathfinder migration RepOS was built
  against is recorded in `packages/sources` and checked on boot. Bump it in
  the same commit that adapts the queries.
- **One module per Today block.** Queries against Pathfinder tables live in
  `apps/api/src/blocks/<block>.ts`, nowhere else, so a schema change lands in
  one place.
- **Secrets in `.env`, never in `sources.json`.** `sources.json` is committed
  and holds slugs, names, kinds, and web URLs only.

## Conventions

Match Pathfinder's: Node 22, TypeScript strict, npm workspaces, Express,
React + Vite, Tailwind, TanStack Query for server state, `useState` for local,
no other state library. ESLint and Prettier configs are copied from
Pathfinder, not reinvented.

## Working style

- Spec before code. A change to behavior updates `docs/REPOS_V1.md` first.
- Small, verified commits with real terminal output in the chat.
- Keep the `## Status` line in `README.md` current.
