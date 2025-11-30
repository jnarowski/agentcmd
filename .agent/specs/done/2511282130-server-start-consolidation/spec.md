# Server Start Consolidation

**Status**: completed
**Type**: issue
**Created**: 2025-11-28
**Package**: apps/app
**Total Complexity**: 47 points
**Tasks**: 9
**Avg Complexity**: 5.2/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 9        |
| Total Points    | 47       |
| Avg Complexity  | 5.2/10   |
| Max Task        | 8/10     |

## Overview

Consolidate server startup logic into a single shared `startServer()` function. Currently, startup logic is duplicated across `scripts/start.js`, `scripts/start-inngest.js`, and `src/cli/commands/start.ts`. This creates maintenance burden and inconsistency (e.g., `pnpm start` uses `inngest dev` instead of `inngest start` in production mode).

## User Story

As a developer
I want unified server startup logic
So that changes to startup sequence only need one edit and behavior is consistent across all start methods

## Technical Approach

Create two shared utilities in `src/cli/utils/`:
1. `spawnInngest.ts` - Handles inngest process spawning (dev vs prod mode based on NODE_ENV)
2. `startServer.ts` - Core startup sequence (migrations, server, inngest, shutdown)

CLI and scripts become thin wrappers that only handle config sourcing:
- CLI loads from `~/.agentcmd/config.json`
- Scripts load from environment variables (`.env`)

**Key Points**:
- `startServer()` contains ALL startup logic (port check, migrations, server, inngest, shutdown)
- NODE_ENV determines inngest mode: `production` → `inngest start`, else → `inngest dev`
- Scripts gain functionality: port checks, migrations on start
- Convert JS scripts to TypeScript, compile with build

## Files to Create/Modify

### New Files (4)

1. `src/cli/utils/spawnInngest.ts` - Shared inngest spawning logic
2. `src/cli/utils/startServer.ts` - Core server startup function
3. `src/scripts/start.ts` - Thin wrapper for pnpm start
4. `src/scripts/start-inngest.ts` - Standalone inngest for pnpm dev

### Modified Files (3)

1. `src/cli/commands/start.ts` - Refactor to use startServer()
2. `scripts/build-cli.js` - Add src/scripts/ to build output
3. `package.json` - Update script commands

### Deleted Files (2)

1. `scripts/start.js` - Replaced by src/scripts/start.ts
2. `scripts/start-inngest.js` - Replaced by src/scripts/start-inngest.ts

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [x] [task-1] [6/10] Create `src/cli/utils/spawnInngest.ts`
  - Export `SpawnInngestOptions` interface and `spawnInngest()` function
  - Check NODE_ENV to determine mode (production → `inngest start`, else → `inngest dev`)
  - Handle signing key generation for production mode
  - Use INNGEST_CLI_VERSION constant from existing constants.ts
  - File: `src/cli/utils/spawnInngest.ts`

- [x] [task-2] [8/10] Create `src/cli/utils/startServer.ts`
  - Export `StartServerConfig` interface with all config options
  - Export `startServer()` async function with full startup sequence:
    1. Check port availability
    2. Set environment variables from config
    3. Validate JWT_SECRET
    4. Backup database (if createBackups && pending migrations)
    5. Prisma generate + migrate
    6. Start Fastify server as child process
    7. Wait for health check
    8. Start Inngest via spawnInngest()
    9. Print startup banner
    10. Setup graceful shutdown handlers
  - Import and use spawnInngest from ./spawnInngest
  - File: `src/cli/utils/startServer.ts`

- [x] [task-3] [6/10] Refactor `src/cli/commands/start.ts`
  - Remove inline startup logic (~300 lines)
  - Import startServer from ../utils/startServer
  - Keep config loading (loadConfig, mergeWithFlags)
  - Keep path resolution (getDbPath, getInngestDataDir, etc.)
  - Call startServer() with config object
  - File: `src/cli/commands/start.ts`

- [x] [task-4] [4/10] Create `src/scripts/start.ts`
  - Simple wrapper that loads config from environment
  - Import startServer from @/cli/utils/startServer
  - Use local paths (./prisma/dev.db, ./inngest-data, etc.)
  - Set isProduction: true, createBackups: false
  - File: `src/scripts/start.ts`

- [x] [task-5] [3/10] Create `src/scripts/start-inngest.ts`
  - Standalone inngest for pnpm dev (concurrent mode)
  - Import spawnInngest from @/cli/utils/spawnInngest
  - Use local paths, stdio: 'inherit'
  - File: `src/scripts/start-inngest.ts`

- [x] [task-6] [5/10] Update build to compile scripts
  - Modify `scripts/build-cli.js` to include src/scripts/ in esbuild
  - Output to dist/scripts/
  - Ensure @/ aliases resolve correctly
  - File: `scripts/build-cli.js`

- [x] [task-7] [3/10] Update package.json scripts
  - Change "inngest": "tsx src/scripts/start-inngest.ts"
  - Change "start": "node dist/scripts/start.js"
  - File: `package.json`

- [x] [task-8] [2/10] Delete old JS scripts
  - Remove scripts/start.js
  - Remove scripts/start-inngest.js
  - Files: `scripts/start.js`, `scripts/start-inngest.js`

- [x] [task-9] [10/10] Test all start methods
  - Test pnpm dev (concurrent mode with tsx)
  - Test pnpm build && pnpm start (compiled, production mode)
  - Test agentcmd start (CLI with user config)
  - Verify inngest uses correct mode based on NODE_ENV
  - Verify migrations run on start
  - Verify graceful shutdown works
  - Commands: `pnpm dev`, `pnpm build && pnpm start`, `pnpm cli:start`

## Testing Strategy

### Unit Tests

**`src/cli/utils/spawnInngest.test.ts`**:
- Returns correct args for development mode
- Returns correct args for production mode
- Generates signing key when not provided

**`src/cli/utils/startServer.test.ts`**:
- Validates JWT_SECRET is required
- Calls startup sequence in correct order

### Integration Tests

- Manual testing of all three start methods
- Verify inngest mode via logs or Inngest UI

## Success Criteria

- [ ] `pnpm dev` starts server + inngest dev concurrently
- [ ] `pnpm start` (after build) uses `inngest start` with persistence
- [ ] `agentcmd start` works with user config
- [ ] NODE_ENV=production triggers `inngest start`
- [ ] NODE_ENV=development triggers `inngest dev`
- [ ] All scripts converted to TypeScript
- [ ] Old JS scripts deleted
- [ ] No functionality lost

## Validation

**Automated:**

```bash
# Build
pnpm build
# Expected: dist/scripts/start.js and dist/scripts/start-inngest.js exist

# Type check
pnpm check-types
# Expected: no errors

# Lint
pnpm lint
# Expected: no errors
```

**Manual:**

1. Dev mode: `pnpm dev`
   - Verify server starts on :4100
   - Verify Inngest UI on :8288
   - Verify uses `inngest dev` (check logs)

2. Production mode: `pnpm build && pnpm start`
   - Verify server starts
   - Verify uses `inngest start` (check logs for "persistent mode")
   - Verify inngest-data/ directory created

3. CLI mode: `pnpm cli:start`
   - Verify uses ~/.agentcmd/ paths
   - Verify migrations run

## Implementation Notes

### Config Differences

CLI uses `~/.agentcmd/config.json` with full validation and backup support.
Scripts use environment variables from `.env` with simpler defaults.
The `createBackups` flag allows scripts to skip backup logic.

### Path Resolution

Scripts use relative paths (`./prisma/dev.db`) while CLI uses absolute paths from path utilities (`getDbPath()`). The `startServer()` function accepts paths as parameters, making it agnostic to source.

## Dependencies

- No new dependencies

## References

- Plan file: `~/.claude/plans/quizzical-seeking-cupcake.md`
- Existing CLI start: `src/cli/commands/start.ts`
- Existing scripts: `scripts/start.js`, `scripts/start-inngest.js`

## Review Findings

**Review Date:** 2025-11-28
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feat/start-server-refactor
**Commits Reviewed:** 0 (uncommitted changes)

### Summary

Implementation is nearly complete with one critical path resolution bug in `src/scripts/start.ts`. All automated checks pass (type check, lint, build). The consolidation architecture is well-designed with proper separation between `spawnInngest` and `startServer` utilities.

### Phase 1: Create Shared Utilities (Tasks 1-2)

**Status:** ✅ Complete - Both utilities implemented correctly

### Phase 2: Refactor CLI and Scripts (Tasks 3-5)

**Status:** ⚠️ Incomplete - Path resolution bug in start.ts

#### HIGH Priority

- [x] **serverPath resolves to wrong location in compiled start.ts**
  - **File:** `src/scripts/start.ts:32`
  - **Spec Reference:** "Use local paths (./prisma/dev.db, ./inngest-data, etc.)"
  - **Expected:** `serverPath` should resolve to `dist/server/index.js`
  - **Actual:** `join(__dirname, "server/index.js")` resolves to `dist/scripts/server/index.js` after compilation
  - **Fix:** Change to `join(__dirname, "../server/index.js")` to navigate up from `dist/scripts/` to `dist/server/`

### Phase 3: Build and Package (Tasks 6-8)

**Status:** ✅ Complete - Build script updated, package.json updated, old scripts deleted

### Positive Findings

- Clean separation between `spawnInngest.ts` (spawning logic) and `startServer.ts` (orchestration)
- Proper NODE_ENV-based mode detection for Inngest (dev vs production)
- Good error handling with signing key generation fallback
- Build script correctly compiles `src/scripts/start.ts` to `dist/scripts/start.js`
- Type checking, lint, and build all pass

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [x] All findings addressed and tested
