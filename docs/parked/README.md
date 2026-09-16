# Parked specs

Specs that were written, reviewed, and deliberately set aside. Kept so the
reasoning is not lost.

| Spec | Parked | Why | Reentry |
| --- | --- | --- | --- |
| `WORKSPACES_V1.md` + its session brief | 2026-09-16 | Made Pathfinder multi-tenant so one instance could hold Lexington and the Pathfinder venture. Recon showed it touches ~110 SQL sites, every unique constraint, and conflicts with canon (tenancy off the board while the goal is solo dogfood). Replaced by RepOS reading separate Pathfinder instances read-only. | A second rep logs into Pathfinder. Recon findings are summarized in `../REPOS_V1.md` §9. |
