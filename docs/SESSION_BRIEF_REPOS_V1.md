# SESSION BRIEF — REPOS_V1

Repo: `RepOS`. Spec: `docs/REPOS_V1.md`, read in full first. The spec wins any
conflict with this brief. Pathfinder is read from
`Bronsonp2013/reptech-pathfinder` at commit `028af48` and is **never modified**
in this work.

Working rules:
- One verified commit per row of spec §8. Real terminal output, not assertions.
- Diffs come back to chat before each commit.
- Nothing in RepOS may hold a writable database credential. If a step seems
  to need one, stop and say so.
- Reuse Pathfinder's conventions (CLAUDE.md §5–§8 there) for layout, naming,
  and lint config rather than inventing new ones.

## Step 0 — Environment

Confirm Node 22, a reachable Postgres with PostGIS for a local Lexington copy,
and the `repos_reader` role created per spec §6. Show `\du repos_reader` and a
failed INSERT. Stop and wait for go.

## Steps 1–6 — Commits A–F

Follow spec §8 in order. Each commit message: `feat(<area>): <what>` with the
acceptance items it satisfies listed in the body.

## Close-out

Commit hashes A–F, acceptance checklist §7 with evidence lines, anything
deferred with its reentry point.
