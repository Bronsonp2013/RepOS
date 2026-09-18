task_id: lane-deploy-docs
project_root: /home/user/RepOS
objective: Write the deploy surface: a Dockerfile (Node 22, installs workspaces, builds apps/web, runs the API with tsx and serves the built web bundle or documents Caddy serving it), a docker-compose.yml service wired to .env with no database of its own (RepOS only reads external ones), a Caddyfile.example with one tailnet site block for RepOS and notes for the per-venture Pathfinder blocks, and docs/DEPLOY.md covering the repos_reader role SQL from docs/REPOS_V1.md section 6 and standing up the second Pathfinder instance from section 5, plus first-run steps. Keep the README '## Status' line current (spec committed, build in progress under orchestration). There is no Docker daemon in this sandbox, so verify with typecheck plus lint and a careful read-through rather than a build; say in handoff_note that the image was not built. Do not touch any file under apps/, packages/, e2e/, test/, sources.json, .env* or the root configs. Criteria served: C1.
owns:
  - Dockerfile
  - docker-compose.yml
  - Caddyfile.example
  - docs/DEPLOY.md
  - README.md
may_read:
  - docs/REPOS_V1.md
  - package.json
  - .env.example
  - sources.json
  - apps/api/src/index.ts
  - apps/web/vite.config.ts
verification_cmd: npm run typecheck && npm run lint
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Create or modify only your owned paths. If you need a change outside them (a new dependency, an index.ts export, a server.ts route, a config change), do not make it. Return it in unresolved and the integration worker will apply it.
isolation: Work only inside project_root. Shared toolchains (npm registry, global SDKs, published documentation) are available and exempt. Never read or touch /home/user/reptech-pathfinder. Do not run git commit.
