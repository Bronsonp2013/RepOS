# WORKSPACES_V1

**Status:** Spec — commit before any code
**Owner:** Bronson
**Canon impact:** Adds tenancy principle + new-table rule. Bump PATHFINDER_CANON.md in-session with the final commit.
**Sequencing:** Lands BEFORE Dashboard and BEFORE pipeline split. Every table added after this inherits `workspace_id` instead of being retrofitted.

---

## 1. Purpose

Pathfinder becomes multi-workspace. A workspace is a tenant boundary: every rep-owned row belongs to exactly one workspace, and every request runs inside exactly one workspace.

Two workspaces ship in V1:

| slug | name | kind | holds |
|---|---|---|---|
| `lexington` | Lexington | `territory` | Bronson's LHB accounts, locations, trips, cycles — everything that exists today |
| `pathfinder` | Pathfinder | `venture` | Reps as prospects/customers, discovery-call interactions, trials, paying seats |

This is the same seam Clerk multi-rep needs later. Nothing here is throwaway.

**Out of scope for V1:** Clerk, user→workspace permissions, cross-workspace views (Rep OS shell, Week 9), workspace creation UI, per-workspace feature gating.

---

## 2. Decisions (locked)

1. **Workspace = tenant.** One `workspaces` table; `workspace_id NOT NULL` FK on every rep-owned table.
2. **Scoping is explicit.** API requires `X-Workspace-Id` on every request. Missing/invalid header → `400`. Never default.
3. **All existing data backfills to `lexington`.**
4. **`pathfinder` starts empty** except its own pipeline stages and meeting types.
5. **New-table rule:** any migration that creates a rep-owned table must add `workspace_id` in the same migration. No exceptions.
6. **Lexington import = reconcile**, not replace. Source of truth is the LHB Customer Address Book, billing address canonical. Nothing is deleted.

---

## 3. Schema — migration 0015

### 3.1 `workspaces`

```sql
CREATE TABLE workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('territory','venture')),
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO workspaces (slug, name, kind) VALUES
  ('lexington', 'Lexington', 'territory'),
  ('pathfinder', 'Pathfinder', 'venture');
```

`kind` is the only enum-style column, and it is intentionally small. It exists so the Rep OS shell (Week 9) can render territories and ventures differently. Do not add a third value in this migration.

### 3.2 Tables receiving `workspace_id`

Recon confirms the exact list. Expected from canon:

- `accounts`
- `account_locations`
- `prospects`
- `interactions`
- `trips`
- `trip_stops` (via `trips` — add the column only if `trip_stops` is queried independently of `trips`; otherwise skip and rely on the join)
- `meeting_types`
- `cycles`
- pipeline stage table(s) — whatever holds the configurable Accounts and Prospects stages
- any exclusion / settings rows that are per-rep

**Rule for the recon:** if a table has a `rep_id`, `owner_id`, or is filtered per-rep anywhere in the API, it gets `workspace_id`. Lookup/reference tables shared across reps do not.

### 3.3 Column add, in four steps, one migration file

```sql
-- (a) add nullable
ALTER TABLE accounts ADD COLUMN workspace_id uuid REFERENCES workspaces(id);
-- ...repeat per table

-- (b) backfill
UPDATE accounts SET workspace_id = (SELECT id FROM workspaces WHERE slug = 'lexington');
-- ...repeat per table

-- (c) enforce
ALTER TABLE accounts ALTER COLUMN workspace_id SET NOT NULL;
-- ...repeat per table

-- (d) index
CREATE INDEX accounts_workspace_id_idx ON accounts (workspace_id, id);
-- ...repeat per table
```

Unique constraints that are currently global (e.g. account customer number, meeting type name) become unique per workspace: drop the old constraint, add `UNIQUE (workspace_id, <col>)`.

### 3.4 Down migration

Drop indexes, drop `workspace_id` columns, restore any per-workspace uniques to their global form, drop `workspaces`. Must run clean on dev. This is the last cheap moment to reverse — after Dashboard lands on top, it isn't.

### 3.5 Seeds — `pathfinder` workspace

Pipeline stages (Prospects): `Researched → Called → Transcript Logged → Trial → Paying → Lost`
Pipeline stages (Accounts): `Active → At Risk → Churned`
Meeting types: `Discovery call` (15 min), `Demo` (30 min)

Seed as ordinary rows in the existing configurable tables. If stages are not yet rep-configurable rows (pipeline split not landed), seed what the current schema allows and note the gap in the commit message — do not build the pipeline split inside this session.

---

## 4. API — scoping middleware

### 4.1 Middleware

- Reads `X-Workspace-Id`.
- Missing → `400 { error: "workspace_required" }`.
- Not a valid uuid or no matching row → `400 { error: "workspace_invalid" }`.
- Attaches `req.workspaceId`.
- Mounted before every route. Health check and any future auth/webhook routes are the only exclusions — list them explicitly in code, not by pattern.

### 4.2 Query helper

One helper (name per repo convention, e.g. `scoped(req)`) that every data-access call goes through and injects `WHERE workspace_id = $1`. Raw queries that bypass it are a defect.

Inserts stamp `workspace_id` from `req.workspaceId` — never from the request body. If a body includes `workspace_id`, ignore it.

### 4.3 Worker (BullMQ)

Every job payload carries `workspaceId`. Worker sets the same scoping context before any DB access. Jobs enqueued without `workspaceId` fail fast at enqueue time.

### 4.4 Endpoint

`GET /workspaces` — returns the list (`id, slug, name, kind`). This is the one route that does not require the header, since the client needs it to pick one.

---

## 5. Frontend

- `activeWorkspace` atom. Persisted to localStorage under a namespaced key. Initial value: `lexington` if none stored.
- API client attaches `X-Workspace-Id` to every request from the atom. One place, not per-call.
- Workspace switcher in the nav: shows `name`, lists the two entries from `GET /workspaces`. Switching clears any in-memory account/trip caches so nothing from the previous workspace lingers on screen.
- No workspace-kind-based UI gating yet. Map, trips, routing all remain visible in `pathfinder` even though unused.

---

## 6. Lexington reconcile

### 6.1 Source

LHB Customer Address Book export. Normalize to **one row per customer number**, using the **billing** address. Shipping rows are dropped (many ship-tos are third-party warehouses).

Normalized fields: `customer_number, name, billing_address_1, billing_address_2, city, state, zip, phone, email (if present)`.

### 6.2 Match order against existing `lexington` accounts

1. `customer_number` exact match.
2. Normalized name (lowercased, punctuation stripped, common suffixes removed) + city.
3. Everything else → manual review file.

### 6.3 Script outputs — dry run first

Script produces a report before touching data:

| bucket | action |
|---|---|
| **matched** | update billing address fields if they differ; log the diff |
| **new** | insert as account in `lexington`, stage per current default |
| **unmatched-existing** | accounts in Pathfinder with no LHB counterpart — flag with a note, do NOT delete |
| **needs-review** | ambiguous name matches — output to a CSV for Bronson |

Dry-run report returns to chat. Apply only after approval. Apply is idempotent — running it twice produces no second set of changes.

### 6.4 If the account table is nearly empty

Skip matching. Same normalization, straight insert. Note this in the commit message.

---

## 7. Acceptance — Week 1 is done when all pass

1. Migration 0015 runs up on dev with real output shown. Down runs clean. Up again.
2. `SELECT count(*) FROM accounts WHERE workspace_id IS NULL` → `0` for every scoped table.
3. `GET /accounts` with no header → `400 workspace_required`.
4. `GET /accounts` with a random uuid → `400 workspace_invalid`.
5. `GET /workspaces` returns both rows without a header.
6. Graham fixture (account 48, appointment 2026-07-08 2 PM–3 PM Central) loads in `lexington`, is absent in `pathfinder`.
7. Switcher in nav flips between the two; account list changes accordingly; nothing from the other workspace remains on screen.
8. A trip built and saved in `lexington` is invisible from `pathfinder` (route + optimizer still run unchanged in `lexington`).
9. Worker job enqueued without `workspaceId` fails at enqueue with a clear error.
10. Reconcile dry-run report reviewed; apply run; `lexington` account count equals distinct customer numbers in the address book plus flagged unmatched-existing.
11. `pathfinder` shows its seeded stages and two meeting types, zero accounts, zero prospects.

---

## 8. Canon additions

Add to PATHFINDER_CANON.md with the final commit:

- **TENANCY:** A workspace is the tenant boundary. Every rep-owned row has `workspace_id NOT NULL`. Every request and every job runs in exactly one workspace, set explicitly — never defaulted.
- **NEW-TABLE RULE:** Any migration creating a rep-owned table adds `workspace_id` in that same migration.
- **RECONCILE RULE:** LHB address book is the source of truth for Lexington accounts; billing address canonical; reconcile never deletes.

---

## 9. Risks

- **Quiet regressions.** This touches every table and every route — same class as the pipeline split. Run the full constrained-optimizer arc on the Graham fixture before closing.
- **Unique constraints.** Globally-unique columns that become per-workspace are the most likely place for a missed constraint. Recon must list every UNIQUE on scoped tables.
- **Raw queries.** Any `pool.query` outside the helper is a leak path. Recon greps for them and the session either routes them through the helper or lists them as accepted exceptions.
- **Vite env / localStorage key collisions** on the NAS later — namespace the key now.

---

## 10. Reentry points (parked)

- Clerk: user→workspace membership table, middleware gains an allowed-list check. No other change.
- Rep OS shell (Week 9): cross-workspace Today view reads `workspaces.kind` to lay out territories vs ventures.
- Workspace creation UI: not needed until a second rep or a third venture.
