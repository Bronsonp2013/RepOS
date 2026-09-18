# Orchestration state — RepOS V1

**Rewrite this file at every phase boundary. Never append.**

## Run

| | |
|---|---|
| Project root | `/home/user/RepOS` |
| Size | `L` |
| Agent budget | none set |
| Git | repo at 6e68f30 on `claude/starting-project-k5ji80` |
| Attempt | 1 |
| Concurrency | 4 CPUs → 2 workers at a time |

## Frozen acceptance criteria

Not yet frozen. Written after phase 1 from docs/REPOS_V1.md §7.

## Current phase

`1 — Recon and scope`

## Lane map

Not yet produced.

## Tasks

| task_id | label | model | attempt | verdict |
|---|---|---|---|---|
| scout-env | `recon:scout-env` | sonnet | 1 | running |

## Open decisions

| id | Question | Options | Status |
|---|---|---|---|
| D0 | Bronson said "proceed"; treated as run-unattended. Phase 1 and 2 gates become notifications, not questions. | — | assumed |

## Degradations

- Declared isolation exception: the phase-1 scout may READ `/home/user/reptech-pathfinder`
  (Pathfinder, sibling project, commit 028af48) solely to copy its migration SQL and lint
  configs into RepOS as fixtures. No worker ever writes there. No later worker reads it.
- Sandbox has no Docker. Local PostgreSQL 16 binaries exist; PostGIS presence unknown until
  the scout reports.
