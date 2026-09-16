# Data Model

Every record is a Markdown file with YAML front matter. Fields marked required
must be present. Free-form notes go in the body under the headings listed.

## Account (`data/accounts/<state>/<slug>.md`)

```yaml
---
type: account
name: Example Furniture Co.
account_id: ""            # Lexington account number, if known
segment: retailer         # retailer | designer | contract
brands: [lexington, artistica]
city: Dallas
state: TX
metro: dfw
status: active            # active | dormant | lost | prospect-converted
contact_name: ""
contact_email: ""
contact_phone: ""
last_visit: 2026-09-01    # ISO date or blank
next_action: ""
---
```

Body sections: `## Profile`, `## Floor and lineup`, `## Open items`, `## Log`
(append-only, newest first, one dated bullet per touch).

## Prospect (`data/prospects/<metro-slug>/<slug>.md`)

```yaml
---
type: prospect
name: Example Interiors
segment: designer
city: Tulsa
state: OK
metro: tulsa
source: google-places     # google-places | directory | referral | drive-by
fit_score: 0              # 0 to 5, see docs/scoring when added
stage: identified         # identified | contacted | meeting | converted | disqualified
website: ""
phone: ""
next_action: ""
---
```

Body sections: `## Why they fit`, `## Log`.

## Price list (`data/pricing/<brand>-<category>-<tier>.md`)

One file per source list and tier. Never blend tiers. Header block records the
source PDF name, effective date, brand, category (casegoods or upholstery), and
tier (program, wholesale, designer, decorator). Rows are a Markdown table with
the columns the source list uses.

## Check-in (`data/checkins/<yyyy>/<yyyy-mm>.md`)

One file per month. A table with date, account slug, type (visit or call),
summary, and follow-up. Generated from Badger exports by a script; hand edits
are allowed and preserved.

## Brief (`data/briefs/<yyyy-mm-dd>-<account-slug>.md`)

Generated pre-visit brief. Regenerate freely; these are derived from the
account record and check-in history and are safe to overwrite.
