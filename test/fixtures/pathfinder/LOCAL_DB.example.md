# Local test databases (template)

Copy this file to `LOCAL_DB.md` in the same directory (gitignored — never
commit it) and fill in your local cluster's real values. See
`test/fixtures/pathfinder/README.md` for what loads into each database and
`load.sh` for the loader itself.

## Superuser

```
postgresql://postgres:<password>@127.0.0.1:5432/postgres
```

## repos_test_lexington

Owner role: `repos_owner`. Loaded with all 29 migrations + `seed-graham.sql`
(account 48, appointment 1, trip 1, trip_stops 1).

```
postgresql://repos_owner@127.0.0.1:5432/repos_test_lexington   (owner)
postgresql://repos_reader:<password>@127.0.0.1:5432/repos_test_lexington
```

## repos_test_venture

Owner role: `repos_owner`. Loaded with all 29 migrations, no seed data
(mirrors the empty venture instance in `docs/REPOS_V1.md` §5).

```
postgresql://repos_owner@127.0.0.1:5432/repos_test_venture   (owner)
postgresql://repos_reader:<password>@127.0.0.1:5432/repos_test_venture
```

## repos_reader (both databases)

Single shared role, `SELECT`-only per `docs/REPOS_V1.md` §6.

```
Host:     127.0.0.1
Port:     5432
User:     repos_reader
Password: <password>
```

## Notes

- These are local test-only credentials, not production secrets — still
  keep `LOCAL_DB.md` out of the repo (see `.gitignore`), since
  `docs/REPOS_V1.md` §6 says credentials never belong in a committed file.
- Run `test/fixtures/pathfinder/load.sh --check` with `PGPASSWORD`,
  `PGHOST`, `PGPORT` exported (or edit the script's defaults) to verify the
  `repos_reader` role is actually read-only.
