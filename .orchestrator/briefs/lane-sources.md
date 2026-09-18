task_id: lane-sources
project_root: /home/user/RepOS
objective: Implement packages/sources: parseSourcesFile and loadSourceConfigs (config.ts); withReadOnlyOption and createSourcePools, appending options=-c default_transaction_read_only=on with max 5 (pool.ts); compareMigrations, checkSourceSchema and assertSchemaUsable against KNOWN_MIGRATIONS (schema.ts). Extend types.ts only if a real contract gap forces it, and say so in handoff_note. Make readonly.test.ts, schema.test.ts and credentials.test.ts pass against the fixture DBs named in .env.test; schema.test.ts builds and drops a throwaway DB via REPOS_TEST_SUPERUSER_DATABASE_URL. Never hold a writable credential in library code. Do not touch packages/sources/src/index.ts, packages/shared/**, apps/**, any package.json, sources.json or .env*. Criteria served: C1, C3, C4, C9.
owns:
  - packages/sources/src/types.ts
  - packages/sources/src/config.ts
  - packages/sources/src/pool.ts
  - packages/sources/src/schema.ts
  - packages/sources/src/readonly.test.ts
  - packages/sources/src/schema.test.ts
  - packages/sources/src/credentials.test.ts
may_read:
  - packages/shared/src/**
  - packages/sources/src/index.ts
  - sources.json
  - .env.test.example
  - .env.test
  - test/fixtures/pathfinder/**
  - docs/REPOS_V1.md
verification_cmd: npm run typecheck && npm run lint && npm test -- readonly && npm test -- schema && npm test -- credentials
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Create or modify only your owned paths. If you need a change outside them (a new dependency, an index.ts export, a server.ts route, a config change), do not make it. Return it in unresolved and the integration worker will apply it.
isolation: Work only inside project_root. Shared toolchains (npm registry, global SDKs, published documentation) are available and exempt. Never read or touch /home/user/reptech-pathfinder. Do not run git commit.
