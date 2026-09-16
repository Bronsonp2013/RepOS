# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

RepOS is a sales rep operating system for a Lexington Home Brands territory rep
(TX / OK / AR / LA). It holds account, prospect, pricing, and visit data as
Markdown, plus scripts that produce reports and drafts from that data.

## Conventions

- **Records are Markdown with YAML front matter.** See `docs/DATA_MODEL.md` for
  the required fields per record type. Do not invent new fields without adding
  them to the data model doc.
- **File naming.** Lowercase, hyphenated slugs. Accounts: `data/accounts/<state>/<slug>.md`.
  Prospects: `data/prospects/<metro-slug>/<slug>.md`. Pricing:
  `data/pricing/<brand>-<category>-<tier>.md`.
- **Never blend pricing tiers.** One file per source price list and tier.
- **Never overwrite a record wholesale.** Update fields and append to the
  `## Log` section. History matters for a rep.
- **Derived outputs** (xlsx, pdf, csv exports) go in `out/` and are gitignored.
  Commit the Markdown source, not the export.
- **Secrets** (API keys, Badger or Google credentials) never go in the repo.
  Use environment variables and document them in `docs/ENVIRONMENT.md` when added.

## Working style

- Prefer small, reviewable commits with descriptive messages.
- Scripts live in `scripts/` and must be runnable from the repo root.
- When adding a script, add a one-line entry to the table in `scripts/README.md`.
- Keep `README.md` status line current when a phase completes.
