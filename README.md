# RepOS

**RepOS** is the operating system for a manufacturer's sales rep. It is the single
home for everything a territory rep needs to run the book: accounts, prospects,
price lists, visit history, meeting prep, and the automations that keep them current.

The first territory it serves is Lexington Home Brands (Lexington, Artistica,
Tommy Bahama, Barclay Butera, Sligh) across TX / OK / AR / LA.

## What lives here

| Area | Purpose |
| --- | --- |
| `data/accounts/` | Active customer master: retailers and designers currently on the book |
| `data/prospects/` | Net-new targets by metro, with qualification notes and status |
| `data/pricing/` | Standardized price-lookup files, one file per brand, category and tier |
| `data/checkins/` | Visit and call logs (Badger exports, normalized) |
| `data/briefs/` | Pre-visit briefs, showroom prep, and day plans |
| `scripts/` | Automations: parsers, report builders, sweeps |
| `docs/` | Roadmap, data model, and conventions |

## Principles

1. **Markdown first.** Every record is a plain-text file that a human can read and
   a Claude session can search. Spreadsheets and PDFs are derived outputs.
2. **One source of truth per record.** An account has one file. A price list has
   one file per tier. Never blend tiers or duplicate accounts.
3. **Automations write, humans decide.** Scripts produce drafts, rankings, and
   reports. The rep approves outreach and commitments.
4. **Territory aware.** Every record carries a metro and state so day planning
   and sweeps can filter geographically.

## Getting started

```bash
git clone https://github.com/Bronsonp2013/RepOS.git
cd RepOS
```

Read `docs/ROADMAP.md` for the build plan and `docs/DATA_MODEL.md` for record
formats. Conventions for Claude Code sessions are in `CLAUDE.md`.

## Status

Phase 0: repository scaffold and conventions. See the roadmap for what comes next.
