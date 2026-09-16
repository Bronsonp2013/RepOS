# RepOS Roadmap

Phases are ordered so each one is useful on its own. Stack decisions are deferred
until Phase 1 so the data layer is settled first.

## Phase 0: Scaffold (this commit)

- Repository structure, conventions, data model, roadmap.

## Phase 1: Data foundation

- Import the current customer master into `data/accounts/`.
- Import existing price-lookup files into `data/pricing/`.
- Normalize Badger check-in exports into `data/checkins/`.
- Decide on a validation tool (a small Python script is the default assumption)
  that checks every record against `docs/DATA_MODEL.md`.

## Phase 2: Operating loops

- **Monthly check-in report.** Badger CSV in, Lexington report out.
- **Dormant account revival.** Rank accounts with prior-year revenue and zero YTD,
  draft outreach.
- **Prospect sweeps.** Pull and qualify net-new designers and retailers by metro.
- **Showroom prep.** Generate a pre-visit brief for any account from its record,
  check-in history, and open orders.

## Phase 3: Daily operating surface

- A daily briefing that reads the calendar, open follow-ups, and dormant
  accounts in the day's metro and produces a plan.
- Choose a surface: CLI, a lightweight local web dashboard, or Claude Code
  skills over the repo. This is the main open decision.

## Phase 4: Integrations

- Badger (check-ins), Google Calendar (visits), Gmail (outreach drafts),
  Lexington order and sales reports (revenue by account).

## Open decisions

1. Surface for Phase 3: CLI, web dashboard, or skills-only.
2. Language for scripts: Python is assumed because the pricing parsers already
   exist in Python.
3. Whether sales figures live in the repo (private) or stay external.
