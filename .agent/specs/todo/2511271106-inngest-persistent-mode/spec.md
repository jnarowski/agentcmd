# Inngest Persistent Mode for Production

**Status**: draft
**Created**: 2025-11-27
**Package**: apps/app
**Total Complexity**: 67 points
**Phases**: 5
**Tasks**: 17
**Overall Avg Complexity**: 3.9/10

## Complexity Breakdown

| Phase                        | Tasks | Total Points | Avg Complexity | Max Task |
| ---------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Script Updates      | 2     | 8            | 4.0/10         | 5/10     |
| Phase 2: Config Schema       | 4     | 14           | 3.5/10         | 5/10     |
| Phase 3: CLI Start Command   | 5     | 24           | 4.8/10         | 6/10     |
| Phase 4: Environment Setup   | 2     | 6            | 3.0/10         | 4/10     |
| Phase 5: Documentation       | 4     | 15           | 3.8/10         | 5/10     |
| **Total**                    | **17**| **67**       | **3.9/10**     | **6/10** |

## Overview

Switch from ephemeral `inngest dev` to persistent `inngest start` for production contexts (pnpm start, agentcmd start) while keeping fast iteration in development (pnpm dev). This enables workflow run history to survive server restarts in production without sacrificing developer experience.

## User Story

As a CLI user
I want workflow run history to persist across server restarts
So that I don't lose execution data when the server crashes or is restarted

## Technical Approach

Use mode detection based on `NODE_ENV` to conditionally spawn different Inngest commands:
- Development: `inngest dev` (ephemeral, fast 2-3s startup)
- Production: `inngest start` (SQLite persistence, 5-10s startup)

The implementation adds conditional spawning logic in start scripts and CLI commands while maintaining backward compatibility with current development workflow.

## Key Design Decisions

1. **Mode Detection via NODE_ENV**: Use `NODE_ENV === 'production'` to determine which Inngest command to spawn - simpler than additional configuration flags
2. **Default Keys for Local Dev**: Provide default event/signing keys ("local-prod-key") for production mode without external Inngest - removes setup friction
3. **No Code Changes to Inngest Client**: Inngest SDK automatically reads `INNGEST_BASE_URL` from environment - no modifications needed to `createWorkflowClient.ts`

## Architecture

### File Structure

```
apps/app/
├── scripts/
│   ├── start-inngest.js          # Mode detection logic
│   └── start.js                   # Ensure NODE_ENV set
├── src/
│   ├── cli/
│   │   └── commands/
│   │       └── start.ts           # Conditional spawning
│   ├── server/
│   │   └── config/
│   │       ├── schemas.ts         # Add event/signing keys
│   │       └── index.ts           # Map env vars
│   └── shared/
│       └── utils/
│           └── inngestEnv.ts      # Remove INNGEST_DEV in prod
└── .env.example                    # Document new vars
```

### Integration Points

**Script Layer**:
- `scripts/start-inngest.js` - Detects production mode, spawns appropriate command
- `scripts/start.js` - Sets NODE_ENV=production

**CLI Layer**:
- `src/cli/commands/start.ts` - Conditional spawning based on production flag
- `src/cli/utils/config.ts` - No changes needed

**Server Config**:
- `src/server/config/schemas.ts` - Add eventKey/signingKey fields
- `src/server/config/index.ts` - Map INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY

**Environment**:
- `src/shared/utils/inngestEnv.ts` - Remove INNGEST_DEV=1 in production mode

## Implementation Details

### 1. Start Script Mode Detection

`scripts/start-inngest.js` needs mode detection to choose between `dev` and `start` commands.

**Key Points**:
- Check `NODE_ENV === 'production'`
- Use `inngest start --event-key --signing-key --port` for production
- Use `inngest dev -u <url>` for development
- Provide default keys for local production

### 2. CLI Start Command Production Flag

`src/cli/commands/start.ts` needs production mode detection and conditional spawning.

**Key Points**:
- Detect production via `NODE_ENV` or `--production` flag
- Spawn `inngest start` in production with event/signing keys
- Spawn `inngest dev` in development with webhook URL
- Update shutdown handler to handle optional inngestProcess

### 3. Configuration Schema Updates

Add event and signing key fields to support `inngest start` authentication.

**Key Points**:
- Add `eventKey` and `signingKey` to WorkflowConfigSchema
- Default values: "local-prod-key" and "local-prod-signing"
- Map from INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY env vars
- Keep devMode flag, set to false when NODE_ENV=production

### 4. Environment Setup

Update `inngestEnv.ts` to remove INNGEST_DEV flag in production mode.

**Key Points**:
- Check NODE_ENV before setting INNGEST_DEV=1
- Remove INNGEST_DEV if NODE_ENV=production
- Keep existing host/port logic unchanged

## Files to Create/Modify

### New Files (0)

None - all changes are modifications to existing files.

### Modified Files (7)

1. `apps/app/scripts/start-inngest.js` - Add mode detection and conditional spawning
2. `apps/app/scripts/start.js` - Ensure NODE_ENV=production is set
3. `apps/app/src/cli/commands/start.ts` - Add production flag and conditional Inngest spawning
4. `apps/app/src/server/config/schemas.ts` - Add eventKey and signingKey to WorkflowConfigSchema
5. `apps/app/src/server/config/index.ts` - Map INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY env vars
6. `apps/app/src/shared/utils/inngestEnv.ts` - Remove INNGEST_DEV in production mode
7. `apps/app/.env.example` - Document INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Script Updates

**Phase Complexity**: 8 points (avg 4.0/10)

- [ ] 1.1 [5/10] Update `scripts/start-inngest.js` with mode detection
  - Add `isProduction = process.env.NODE_ENV === 'production'` check
  - Add conditional spawning: `inngest start` vs `inngest dev`
  - For production: Use `--event-key`, `--signing-key`, `--port` flags
  - For development: Use `-u <url>` flag
  - Provide default keys: 'local-prod-key', 'local-prod-signing'
  - File: `apps/app/scripts/start-inngest.js`

- [ ] 1.2 [3/10] Ensure `scripts/start.js` sets NODE_ENV=production
  - Add `process.env.NODE_ENV = 'production'` at top of file
  - Verify production mode is set before starting services
  - File: `apps/app/scripts/start.js`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Configuration Schema Updates

**Phase Complexity**: 14 points (avg 3.5/10)

- [ ] 2.1 [5/10] Add event and signing keys to `WorkflowConfigSchema`
  - Add `eventKey: z.string().optional()` field
  - Add `signingKey: z.string().optional()` field
  - Update `devMode` default based on NODE_ENV
  - File: `apps/app/src/server/config/schemas.ts`

- [ ] 2.2 [4/10] Map environment variables in server config
  - Add `eventKey: env.INNGEST_EVENT_KEY` mapping
  - Add `signingKey: env.INNGEST_SIGNING_KEY` mapping
  - Update `devMode: parseBoolean(env.INNGEST_DEV_MODE, env.NODE_ENV !== 'production')`
  - File: `apps/app/src/server/config/index.ts`

- [ ] 2.3 [3/10] Update package.json production script
  - Verify `start` script sets NODE_ENV=production
  - Current: `"start": "NODE_ENV=production node scripts/start.js"`
  - File: `apps/app/package.json`

- [ ] 2.4 [2/10] Document environment variables
  - Add INNGEST_EVENT_KEY with comment about production use
  - Add INNGEST_SIGNING_KEY with comment about optional
  - Add note about defaults for local production
  - File: `apps/app/.env.example`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: CLI Start Command Updates

**Phase Complexity**: 24 points (avg 4.8/10)

- [ ] 3.1 [3/10] Add production flag to CLI command
  - Add `.option("--production", "Use production mode with persistent Inngest storage")`
  - Update command description to mention mode selection
  - File: `apps/app/src/cli/commands/start.ts`

- [ ] 3.2 [4/10] Add production mode detection
  - Create `isProduction` variable from flags or NODE_ENV
  - Set `process.env.NODE_ENV = isProduction ? "production" : process.env.NODE_ENV || "development"`
  - File: `apps/app/src/cli/commands/start.ts`

- [ ] 3.3 [6/10] Implement conditional Inngest spawning
  - Add `if (isProduction)` block for `inngest start` command
  - Use flags: `--event-key`, `--signing-key`, `--port`
  - Default keys: `process.env.INNGEST_EVENT_KEY || "local-prod-key"`
  - Add `else` block for `inngest dev` command (existing logic)
  - Update console messages to indicate mode
  - File: `apps/app/src/cli/commands/start.ts` (lines 211-231)

- [ ] 3.4 [5/10] Update shutdown handler
  - Modify SIGINT handler to only kill inngestProcess if it exists
  - Add null check: `if (inngestProcess) { inngestProcess.kill("SIGTERM"); }`
  - File: `apps/app/src/cli/commands/start.ts` (lines 262-267)

- [ ] 3.5 [6/10] Add production mode logging
  - Log "Starting Inngest Server (persistent mode)" when production
  - Log "Starting Inngest Dev Server" when development
  - Include port in both messages
  - File: `apps/app/src/cli/commands/start.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: Environment Setup Updates

**Phase Complexity**: 6 points (avg 3.0/10)

- [ ] 4.1 [4/10] Update `inngestEnv.ts` to handle production mode
  - Check `NODE_ENV === 'production'` before setting INNGEST_DEV
  - Only set `INNGEST_DEV = "1"` if not production
  - Remove INNGEST_DEV if production: `delete process.env.INNGEST_DEV`
  - File: `apps/app/src/shared/utils/inngestEnv.ts`

- [ ] 4.2 [2/10] Verify environment variable flow
  - Check that NODE_ENV flows from CLI → scripts → server config
  - Verify INNGEST_BASE_URL is set correctly in both modes
  - Test that production mode removes INNGEST_DEV flag
  - No file changes needed - verification only

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 5: Documentation and Testing

**Phase Complexity**: 15 points (avg 3.8/10)

- [ ] 5.1 [5/10] Add persistence documentation to workflow-system.md
  - Create "Inngest Persistence" section
  - Document dev mode (ephemeral) vs production mode (persistent)
  - Explain what data persists in each mode
  - Document default SQLite location for Inngest
  - File: `.agent/docs/workflow-system.md`

- [ ] 5.2 [4/10] Test development mode (pnpm dev)
  - Run `pnpm dev`
  - Verify `inngest dev` spawned (check logs)
  - Create workflow run, check UI at localhost:8288
  - Stop and restart, verify history lost (expected)
  - No file changes needed - testing only

- [ ] 5.3 [3/10] Test production mode (pnpm start)
  - Run `pnpm start`
  - Verify `inngest start` spawned (check logs)
  - Create workflow run, check UI at localhost:8288
  - Stop and restart, verify history persists
  - No file changes needed - testing only

- [ ] 5.4 [3/10] Test CLI production mode (agentcmd start)
  - Run `agentcmd start`
  - Verify `inngest start` spawned by default
  - Test with `--production` flag explicitly
  - Verify persistence across restarts
  - No file changes needed - testing only

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

No unit tests required - this is primarily configuration and spawning logic that's better tested via integration.

### Integration Tests

Test mode detection and command spawning:
- Verify `NODE_ENV=development` spawns `inngest dev`
- Verify `NODE_ENV=production` spawns `inngest start`
- Verify default keys used when env vars not set
- Verify production mode removes INNGEST_DEV flag

### Manual Testing

**Development Mode:**
1. Run `pnpm dev`
2. Check logs show "Starting Inngest Dev Server"
3. Verify process spawns with `inngest dev -u <url>`
4. Create workflow run, verify in UI
5. Restart, verify history lost (expected)

**Production Mode:**
1. Run `pnpm start`
2. Check logs show "Starting Inngest Server (persistent mode)"
3. Verify process spawns with `inngest start --event-key --signing-key --port`
4. Create workflow run, verify in UI
5. Restart, verify history persists

**CLI Mode:**
1. Run `agentcmd start`
2. Verify production mode by default
3. Test `agentcmd start --production` explicitly
4. Verify persistence across restarts

## Success Criteria

- [ ] `pnpm dev` spawns `inngest dev` (ephemeral mode)
- [ ] `pnpm start` spawns `inngest start` (persistent mode)
- [ ] `agentcmd start` uses production mode by default
- [ ] Workflow history persists across restarts in production
- [ ] Workflow history is ephemeral in development (expected)
- [ ] Development startup remains fast (~2-3 seconds)
- [ ] Production startup is acceptable (~5-10 seconds)
- [ ] Functions execute locally in both modes
- [ ] No breaking changes to existing workflows
- [ ] Default keys work for local production without external Inngest
- [ ] Documentation clearly explains mode differences

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Successful build with no errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors
```

**Manual Verification:**

**Development Mode:**

1. Start development: `pnpm dev`
2. Check logs for: "Starting Inngest Dev Server"
3. Verify process: `ps aux | grep inngest-cli`
   - Should show: `inngest-cli@latest dev -u http://...`
4. Create workflow run via UI
5. Check Inngest UI: http://localhost:8288 (should show run)
6. Stop server: `Ctrl+C`
7. Restart: `pnpm dev`
8. Check Inngest UI: History should be empty (expected ephemeral behavior)

**Production Mode:**

1. Start production: `pnpm start`
2. Check logs for: "Starting Inngest Server (persistent mode)"
3. Verify process: `ps aux | grep inngest-cli`
   - Should show: `inngest-cli@latest start --event-key ... --signing-key ... --port 8288`
4. Create workflow run via UI
5. Check Inngest UI: http://localhost:8288 (should show run)
6. Stop server: `Ctrl+C`
7. Restart: `pnpm start`
8. Check Inngest UI: History should persist (run still visible)

**CLI Production Mode:**

1. Start CLI: `agentcmd start`
2. Verify `inngest start` command used (check logs)
3. Create workflow run
4. Stop and restart: `agentcmd start`
5. Verify workflow history persists
6. Test explicit flag: `agentcmd start --production`
7. Verify same behavior

**Feature-Specific Checks:**

- Verify NODE_ENV is set correctly in each mode
- Check INNGEST_DEV flag is removed in production
- Verify default keys work without setting env vars
- Check SQLite database location (Inngest default location)
- Verify graceful shutdown kills Inngest process

## Implementation Notes

### 1. Default Keys for Local Production

The implementation provides default event and signing keys ("local-prod-key", "local-prod-signing") for local production use. These are sufficient for self-hosted Inngest without external service. For production deployments with Inngest Cloud, users should set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY environment variables.

### 2. Mode Detection Priority

Mode is detected in this order:
1. `--production` CLI flag (explicit)
2. `NODE_ENV` environment variable (automatic)
3. Default: development mode

This allows both automatic detection and explicit override when needed.

### 3. Backward Compatibility

The changes maintain full backward compatibility:
- `pnpm dev` continues to work as before (no changes to dev workflow)
- Existing environment variables respected
- No breaking changes to function execution or API

### 4. Startup Time Trade-off

Production mode is 3-7 seconds slower than dev mode due to SQLite initialization. This is acceptable for production use where persistence is more valuable than startup speed. Development mode maintains fast iteration (2-3 second startup).

## Dependencies

- inngest-cli@latest (already installed via npx)
- No new npm packages required
- Node.js 22+ (already required)

## References

- [Inngest Self-Hosting Documentation](https://www.inngest.com/docs/self-hosting#configuration)
- Plan document: `.claude/plans/validated-nibbling-butterfly.md`
- Related spec: Inngest configuration refactor (if exists)

## Next Steps

1. Review spec with team/user for approval
2. Implement Phase 1: Script updates with mode detection
3. Implement Phase 2: Configuration schema updates
4. Implement Phase 3: CLI start command conditional spawning
5. Implement Phase 4: Environment setup updates
6. Complete Phase 5: Documentation and thorough testing
7. Create PR with changes for review
