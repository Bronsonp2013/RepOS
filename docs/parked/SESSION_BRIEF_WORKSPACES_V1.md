# SESSION BRIEF — WORKSPACES_V1

Repo: `~/pathfinder` (WSL Bbond). Spec: `WORKSPACES_V1.md` — read it in full before anything else. The spec wins any conflict with this brief. PATHFINDER_CANON.md wins any conflict with the spec.

Working rules for this session:
- Self-recon first, as ONE report. Do not grep in round trips.
- One verified commit per coherent step. Show real terminal output, never assertions.
- Diffs come back to chat for verification before each commit.
- Verify on the Graham fixture (account 48, appointment 2026-07-08 2 PM–3 PM Central) before closing.
- Scope tags derived from the files actually touched.
- Do not start the pipeline split, Dashboard, or Meeting Types work inside this session, even where it would be convenient.

---

## Step 0 — Recon (single report, no code)

Before writing anything, produce one report covering:

1. **Scoped-table list.** Every table in the schema. For each: does it have `rep_id` / `owner_id` / any per-rep filter in the API? Mark IN or OUT of `workspace_id` scope with one-line reasoning. Flag any table you are unsure about.
2. **Unique constraints** on every IN table — name, columns. These become per-workspace.
3. **Data-access inventory.** Every place the API or worker runs SQL. Identify the existing helper/pool pattern. List any raw `pool.query` / inline SQL outside it.
4. **Route mount order** in the Express app — where a global middleware slots in before routes; which routes must be excluded (health, `GET /workspaces`).
5. **Frontend API client** — the single point where headers are attached, and how state atoms are defined (Jotai/Zustand/etc.) so `activeWorkspace` matches convention.
6. **BullMQ job payloads** — list job types and confirm where `workspaceId` gets added.
7. **Current account count and shape** — `SELECT count(*) FROM accounts`, plus whether a customer-number column exists. Decides reconcile vs fresh import (spec §6.4).
8. **Latest migration number** and the migration file naming convention.

Stop after the report. Wait for go.

---

## Step 1 — Commit A: migration 0015

Files: new migration only.

- Create `workspaces`, insert the two rows.
- Add nullable `workspace_id` to every IN table → backfill to `lexington` → NOT NULL → index `(workspace_id, id)`.
- Convert each global UNIQUE from recon §2 to `UNIQUE (workspace_id, <cols>)`.
- Write the down migration.

Verify with real output:
```
up → for each IN table: SELECT count(*) WHERE workspace_id IS NULL → 0
down → \d accounts shows no workspace_id; workspaces table gone
up again → same zero-null check
```

Commit message: `feat(db): migration 0015 — workspaces table + workspace_id on scoped tables`

---

## Step 2 — Commit B: seeds

Files: seed/migration for `pathfinder` stages + meeting types.

- If pipeline stages are already rep-configurable rows: seed the Prospects and Accounts stages from spec §3.5.
- If not (pipeline split hasn't landed): seed only what the schema allows and put the gap in the commit message. Do not build the split.
- Seed `Discovery call` (15) and `Demo` (30) meeting types in `pathfinder`.

Verify: query showing the seeded rows with their `workspace_id` resolving to `pathfinder`.

Commit message: `feat(db): seed pathfinder workspace stages and meeting types`

---

## Step 3 — Commit C: API scoping

Files: middleware, query helper, route mounting, `GET /workspaces`.

- Middleware per spec §4.1. Explicit exclusion list in code.
- Scoped query helper per §4.2. Route every data-access call from recon §3 through it. Any raw query you cannot route: list it in the commit message as an accepted exception with reasoning.
- Inserts stamp `workspace_id` from `req.workspaceId`; body value ignored.
- `GET /workspaces` — no header required.

Verify with curl, real output for each:
```
GET /accounts (no header)            → 400 workspace_required
GET /accounts (random uuid)          → 400 workspace_invalid
GET /accounts (lexington id)         → account list, includes 48
GET /accounts (pathfinder id)        → []
GET /workspaces (no header)          → both rows
POST /accounts (pathfinder header, body has workspace_id=lexington) → row lands in pathfinder
```

Commit message: `feat(api): workspace scoping middleware + scoped query helper`

---

## Step 4 — Commit D: worker

Files: job enqueue sites, worker context setup.

- Every job payload carries `workspaceId`. Enqueue without it throws.
- Worker sets scoping context before DB access.

Verify: enqueue a real job type with and without `workspaceId`; show the throw and the successful run.

Commit message: `feat(worker): workspace context on all jobs`

---

## Step 5 — Commit E: frontend switcher

Files: atom, API client, nav.

- `activeWorkspace` atom, localStorage under a namespaced key, default `lexington`.
- API client attaches header from the atom — one place.
- Switcher in nav from `GET /workspaces`. On switch: clear in-memory caches for accounts/trips/prospects.
- No kind-based UI gating.

Verify in browser: switch to `pathfinder` → account list empty, map has no pins. Switch back → Graham fixture present. Screenshot or described DOM state is acceptable; network tab showing the header is required.

Commit message: `feat(web): workspace switcher + scoped API client`

---

## Step 6 — Full-arc regression

No new code. Run the M3B arc on the Graham fixture inside `lexington`: build a trip with the anchored appointment, add a free stop, reoptimize, pin, save, reload. Confirm identical behavior to pre-0015. Then confirm the saved trip is not visible from `pathfinder`.

Any deviation stops the session. Report it, do not patch it inline.

---

## Step 7 — Commit F: reconcile script

Files: `scripts/reconcile-lexington.(ts|js)` (or per repo convention), README line.

- Input: LHB Customer Address Book export path.
- Normalize per spec §6.1 — one row per customer number, billing address only.
- Match order per §6.2.
- `--dry-run` (default) prints the four-bucket report and writes `needs-review.csv`. `--apply` performs matched updates + new inserts, idempotent.
- If recon §7 showed a near-empty accounts table, implement as fresh import with the same normalization and say so in the commit.

Verify: run `--dry-run`, paste the bucket counts and a sample of each bucket to chat. **Stop and wait for approval before `--apply`.**

After approval: run `--apply`, then run `--apply` again and show zero changes on the second pass. Show final `lexington` account count.

Commit message: `feat(scripts): lexington address-book reconcile (dry-run/apply)`

---

## Step 8 — Commit G: canon bump

Files: `PATHFINDER_CANON.md`.

Add the three canon lines from spec §8 (TENANCY, NEW-TABLE RULE, RECONCILE RULE). Move WORKSPACES_V1 to "shipped" in whatever section tracks milestones.

Commit message: `docs(canon): tenancy, new-table rule, reconcile rule — WORKSPACES_V1 closed`

---

## Close-out report

One block, back to chat:

- Commit hashes A–G with one-line summaries
- Acceptance checklist from spec §7, each item ✔ with the evidence line
- Accepted exceptions (raw queries) if any
- Anything deferred, with the reentry point
