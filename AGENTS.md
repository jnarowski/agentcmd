# Repository Guidelines

## Project Structure & Module Organization
This pnpm/turbo monorepo centers on `apps/web`, where a Fastify API (`src/server`) and Vite/React client (`src/client`) share Prisma schemas in `prisma/`. Reusable logic lives in `packages`: `agent-cli-sdk` (CLI primitives), `agent-workflows` (workflow core), `ui` (design system), plus linting and TS baselines. Operational helpers sit in `scripts/`, fixtures in `mocks/`, and asset folders stay with their owning app or package to keep turbo caching effective.

## Build, Test & Development Commands
- `pnpm dev` boots every package; add `--filter @repo/web` for UI-only work.
- `pnpm build` runs tsc, Vite bundling, and CLI packaging with dependency ordering handled by turbo.
- `pnpm lint`, `pnpm check-types`, and `pnpm check` (lint + types + tests) must pass before a PR.
- `pnpm format` applies Prettier; `pnpm --filter @repo/web prisma:migrate` syncs the DB; `pnpm --filter @repo/agent-cli-sdk test:e2e` validates the SDK against live agents.

## Coding Style & Naming Conventions
TypeScript is mandatory; enable strict mode when touching new tsconfig references. Prettier enforces 2-space indentation, single quotes, and trailing commas—do not hand-format. ESLint extends `packages/eslint-config`; place shared overrides there rather than sprinkling `eslint-disable`. Components live in PascalCase files, hooks/stores use camelCase (`useActiveSession.ts`), and directories stay kebab-case. Tailwind classes should rely on tokens exported by `packages/ui` to guarantee theming consistency.

## Testing Guidelines
Vitest drives most suites; colocate specs as `*.test.ts`/`*.test.tsx` next to the code (`apps/web/src/client/stores/authStore.test.ts`). Browser-facing flows belong in Playwright specs such as `apps/web/test-file-browser.spec.ts`. CLI SDK end-to-end tests live under `packages/agent-cli-sdk/tests/e2e` and require `RUN_E2E_TESTS=true pnpm --filter @repo/agent-cli-sdk test:e2e`. Record failing snapshots or fixtures inside the relevant package instead of the repo root, and document any new mock data in `mocks/README.md` if added.

## Commit & Pull Request Guidelines
Recent commits use short, lowercase, imperative subjects (`fixed diff`, `modifying blocks`); follow that format and optionally prefix the scope (`web:`, `sdk:`) for clarity. The commit body should mention schema changes, migrations, or feature flags. PRs need a concise summary, linked issues, test commands executed, and screenshots or CLI transcripts whenever behavior shifts. Call out required config changes (`.env`, `.agent-workflows.config`) so reviewers can reproduce quickly.

## Security & Configuration Tips
Duplicate `.agent-workflows.config.example` or `.env.example` files locally; never commit secrets. Run Prisma migrations from `apps/web/prisma` and review the SQL before pushing. Fastify rate limiting (`@fastify/rate-limit`) and JWT middleware live in `src/server`; keep them enabled even for debug builds, and avoid logging raw tokens or API keys into `logs/` or `mocks/`.
