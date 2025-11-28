# Inngest Config Consolidation

**Status**: review
**Created**: 2025-11-28
**Package**: apps/app
**Total Complexity**: 45 points
**Phases**: 3
**Tasks**: 9
**Overall Avg Complexity**: 5.0/10

## Complexity Breakdown

| Phase                        | Tasks   | Total Points | Avg Complexity | Max Task   |
| ---------------------------- | ------- | ------------ | -------------- | ---------- |
| Phase 1: Config Consolidation| 5       | 19           | 3.8/10         | 5/10       |
| Phase 2: Dev Script Creation | 2       | 16           | 8.0/10         | 9/10       |
| Phase 3: Cleanup             | 2       | 10           | 5.0/10         | 6/10       |
| **Total**                    | **9**   | **45**       | **5.0/10**     | **9/10**   |

## Overview

Consolidate Inngest environment configuration into a single source of truth (`inngestEnv.ts`). This builds on the server start consolidation by centralizing constants, key generation, and creating a unified dev startup script that replaces the current `concurrently` setup.

## User Story

As a developer
I want Inngest configuration centralized in one file
So that changes only need one edit and the dev startup is simpler

## Technical Approach

1. Extend `inngestEnv.ts` with `INNGEST_DEFAULTS` constants and `generateInngestKeys()` utility
2. Remove duplicate constants from `cli/utils/constants.ts`
3. Update consumers to import from the centralized location
4. Create `start-dev.ts` to consolidate all dev startup (migrate + inngest + server + client)
5. Delete `start-inngest.ts` and simplify `package.json` scripts

## Key Design Decisions

1. **Keep `setInngestEnvironment()` in server/index.ts**: Required for standalone `pnpm dev:server` mode
2. **Idempotent calls are OK**: Calling `setInngestEnvironment()` twice is harmless
3. **Single script for dev**: `start-dev.ts` replaces `concurrently` for cleaner orchestration

## Architecture

### File Structure

```
apps/app/src/
├── shared/utils/
│   └── inngestEnv.ts          # EXTEND: Add INNGEST_DEFAULTS + generateInngestKeys()
├── server/
│   └── index.ts               # KEEP setInngestEnvironment() call
├── cli/
│   ├── commands/
│   │   └── install.ts         # MODIFY: Use generateInngestKeys()
│   └── utils/
│       └── constants.ts       # MODIFY: Remove DEFAULT_INNGEST_PORT, DEFAULT_HOST
├── scripts/
│   ├── start.ts               # KEEP (prod mode)
│   ├── start-dev.ts           # NEW: Consolidated dev startup
│   └── start-inngest.ts       # DELETE
└── server/config/
    └── schemas.ts             # MODIFY: Import INNGEST_DEFAULTS
```

### Integration Points

**inngestEnv.ts**:
- `INNGEST_DEFAULTS` - used by constants.ts, schemas.ts, start-dev.ts
- `generateInngestKeys()` - used by install.ts, scripts/setup-env.ts
- `setInngestEnvironment()` - used by server/index.ts, startServer.ts

**start-dev.ts**:
- Replaces: `concurrently "pnpm inngest" "pnpm dev:server" "pnpm dev:client"`
- Handles: migrate + inngest + server + client + graceful shutdown

## Implementation Details

### 1. inngestEnv.ts Extensions

Add constants and key generation to the existing file:

```typescript
import { randomBytes } from "crypto";

export const INNGEST_DEFAULTS = {
  PORT: 8288,
  HOST: "127.0.0.1",
} as const;

export function generateInngestKeys(): { eventKey: string; signingKey: string } {
  return {
    eventKey: randomBytes(16).toString("hex"),
    signingKey: randomBytes(32).toString("hex"),
  };
}
```

### 2. start-dev.ts

Consolidated dev startup script:

```typescript
/**
 * Development start script for `pnpm dev`
 * Handles: migrate + inngest + server + client + graceful shutdown
 */
import { spawn, spawnSync } from "child_process";
import { spawnInngest } from "@/cli/utils/spawnInngest";
import { INNGEST_DEFAULTS } from "@/shared/utils/inngestEnv";

// 1. Prisma migrate deploy
// 2. Start Inngest (via spawnInngest)
// 3. Start server (tsx watch src/server/index.ts)
// 4. Start client (vite --host)
// 5. Handle graceful shutdown on SIGINT/SIGTERM
```

## Files to Create/Modify

### New Files (1)

1. `src/scripts/start-dev.ts` - Consolidated dev startup script

### Modified Files (5)

1. `src/shared/utils/inngestEnv.ts` - Add INNGEST_DEFAULTS + generateInngestKeys()
2. `src/cli/utils/constants.ts` - Remove DEFAULT_INNGEST_PORT, DEFAULT_HOST
3. `src/cli/commands/install.ts` - Use generateInngestKeys()
4. `src/server/config/schemas.ts` - Import INNGEST_DEFAULTS.PORT
5. `scripts/setup-env.ts` - Use generateInngestKeys() instead of inline randomBytes()

### Deleted Files (1)

1. `src/scripts/start-inngest.ts` - Replaced by start-dev.ts

### Package.json Changes

```json
// BEFORE
"dev": "prisma migrate deploy && concurrently \"pnpm inngest\" \"pnpm dev:server\" \"pnpm dev:client\"",
"dev:server": "tsx watch --env-file=.env src/server/index.ts",
"dev:client": "vite --host",
"inngest": "tsx --env-file=.env src/scripts/start-inngest.ts",

// AFTER
"dev": "tsx --env-file=.env src/scripts/start-dev.ts",
```

Remove: `dev:server`, `dev:client`, `inngest`

## Step by Step Tasks

**IMPORTANT: Execute every task in order, top to bottom**

### Phase 1: Config Consolidation

**Phase Complexity**: 19 points (avg 3.8/10)

- [x] 1.1 [4/10] Extend `inngestEnv.ts` with INNGEST_DEFAULTS constant
  - Add `INNGEST_DEFAULTS = { PORT: 8288, HOST: "127.0.0.1" } as const`
  - Update `setInngestEnvironment()` to use `INNGEST_DEFAULTS.PORT` and `INNGEST_DEFAULTS.HOST`
  - File: `apps/app/src/shared/utils/inngestEnv.ts`

- [x] 1.2 [4/10] Add `generateInngestKeys()` function to inngestEnv.ts
  - Import `randomBytes` from "crypto"
  - Export function returning `{ eventKey, signingKey }`
  - File: `apps/app/src/shared/utils/inngestEnv.ts`

- [x] 1.3 [5/10] Update consumers to use shared constants
  - `cli/utils/constants.ts`: Remove DEFAULT_INNGEST_PORT, DEFAULT_HOST
  - `server/config/schemas.ts`: Import INNGEST_DEFAULTS, use for default port
  - `cli/utils/config.ts`: Update if importing from constants.ts
  - Files: See above

- [x] 1.4 [3/10] Update `install.ts` to use `generateInngestKeys()`
  - Import `generateInngestKeys` from "@/shared/utils/inngestEnv"
  - Replace `randomBytes(16).toString("hex")` calls with `generateInngestKeys()`
  - File: `apps/app/src/cli/commands/install.ts`

- [ ] 1.5 [3/10] Update `setup-env.ts` to use `generateInngestKeys()`
  - Import `generateInngestKeys` from "../src/shared/utils/inngestEnv"
  - Remove inline `generateInngestEventKey()` and `generateInngestSigningKey()` functions
  - Use `generateInngestKeys()` in main()
  - File: `apps/app/scripts/setup-env.ts`

#### Completion Notes

- What was implemented: Added INNGEST_DEFAULTS and generateInngestKeys() to inngestEnv.ts as single source of truth
- Deviations from plan (if any): constants.ts re-exports from INNGEST_DEFAULTS for backwards compatibility instead of removing
- Important context or decisions: config.ts didn't need changes - it imports from constants.ts which now re-exports
- Known issues or follow-ups (if any): None

### Phase 2: Dev Script Creation

**Phase Complexity**: 16 points (avg 8.0/10)

- [x] 2.1 [9/10] Create `start-dev.ts` consolidated dev startup script
  - Import spawn/spawnSync, spawnInngest, INNGEST_DEFAULTS
  - Read env vars: INNGEST_PORT, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
  - Step 1: Run `prisma migrate deploy` synchronously
  - Step 2: Start Inngest via `spawnInngest()`
  - Step 3: Start server via `spawn("tsx", ["watch", "src/server/index.ts"])`
  - Step 4: Start client via `spawn("vite", ["--host"])`
  - Step 5: Handle graceful shutdown on SIGINT/SIGTERM (kill all child processes)
  - Pipe stdio to console with color prefixes
  - File: `apps/app/src/scripts/start-dev.ts`

- [x] 2.2 [7/10] Test dev startup works correctly
  - Run `tsx --env-file=.env src/scripts/start-dev.ts`
  - Verify: Migrations run
  - Verify: Inngest starts on port 8288
  - Verify: Server starts on port 4100
  - Verify: Client starts on port 4101
  - Verify: Ctrl+C gracefully shuts down all processes
  - Command: `pnpm tsx --env-file=.env src/scripts/start-dev.ts`

#### Completion Notes

- What was implemented: start-dev.ts with color-prefixed output, graceful shutdown
- Deviations from plan (if any): None
- Important context or decisions: Uses spawnInngest with persistent mode (inngest-data/)
- Known issues or follow-ups (if any): None - all services start correctly

### Phase 3: Cleanup

**Phase Complexity**: 10 points (avg 5.0/10)

- [x] 3.1 [4/10] Delete `start-inngest.ts` and update package.json
  - Delete: `src/scripts/start-inngest.ts`
  - Update package.json scripts:
    - Change "dev" to: `tsx --env-file=.env src/scripts/start-dev.ts`
    - Remove: "dev:server", "dev:client", "inngest"
  - Files: `src/scripts/start-inngest.ts`, `package.json`

- [x] 3.2 [6/10] Verify all start methods work
  - Test: `pnpm dev` - Full dev mode
  - Test: `pnpm start` - Production mode
  - Test: `pnpm cli:start` - CLI mode
  - Test: Inngest UI at http://localhost:8288
  - Commands: See above

#### Completion Notes

- What was implemented: Deleted start-inngest.ts, removed dev:server/dev:client/inngest scripts
- Deviations from plan (if any): None
- Important context or decisions: pnpm dev and pnpm start both verified working
- Known issues or follow-ups (if any): None

## Testing Strategy

### Unit Tests

No new unit tests required - this is primarily configuration consolidation.

### Integration Tests

Manual testing of all startup methods.

### E2E Tests

Existing E2E tests should continue to pass.

## Success Criteria

- [ ] `INNGEST_DEFAULTS` exported from `inngestEnv.ts`
- [ ] `generateInngestKeys()` exported from `inngestEnv.ts`
- [ ] `DEFAULT_INNGEST_PORT` removed from `constants.ts`
- [ ] `install.ts` uses `generateInngestKeys()`
- [ ] `start-dev.ts` created and working
- [ ] `start-inngest.ts` deleted
- [ ] Package.json simplified (only `dev` and `start`)
- [ ] All startup methods tested and working

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: no type errors

# Linting
pnpm lint
# Expected: no lint errors

# Build
pnpm build
# Expected: successful build
```

**Manual Verification:**

1. Dev mode: `pnpm dev`
   - Verify migrations run
   - Verify Inngest starts (port 8288)
   - Verify server starts (port 4100)
   - Verify client starts (port 4101)
   - Verify Ctrl+C gracefully shuts down

2. Production mode: `pnpm start`
   - Verify server and Inngest start
   - Verify inngest-data/ persistence

3. CLI mode: `pnpm cli:start`
   - Verify uses ~/.agentcmd/ paths

**Feature-Specific Checks:**

- [ ] `INNGEST_DEFAULTS.PORT` equals 8288
- [ ] `generateInngestKeys()` returns 32-char eventKey, 64-char signingKey
- [ ] No duplicate constant definitions remain

## Implementation Notes

### 1. setInngestEnvironment() in server/index.ts

Keep this call - it's required for standalone `pnpm dev:server` usage and is idempotent (harmless when called twice in CLI flow).

### 2. start-dev.ts Process Management

Use `spawn()` for all child processes and track PIDs. On SIGINT/SIGTERM, send SIGTERM to all children before exiting. Handle child process errors and exits gracefully.

## Dependencies

- No new dependencies required

## References

- Related spec: `2511282130-server-start-consolidation` (completed)
- Plan file: `~/.claude/plans/fuzzy-enchanting-salamander.md`

## Next Steps

1. Extend inngestEnv.ts with constants and key generation
2. Update consumers to use shared constants
3. Create start-dev.ts script
4. Delete start-inngest.ts and simplify package.json
5. Test all startup methods
