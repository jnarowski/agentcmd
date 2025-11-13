# Config System Simplification

**Status**: draft
**Created**: 2025-11-13
**Package**: apps/app
**Total Complexity**: 35 points
**Phases**: 3
**Tasks**: 10
**Overall Avg Complexity**: 3.5/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Consolidate Config Files | 3 | 12 | 4.0/10 | 5/10 |
| Phase 2: Update Imports | 4 | 14 | 3.5/10 | 4/10 |
| Phase 3: Update Documentation | 3 | 9 | 3.0/10 | 4/10 |
| **Total** | **10** | **35** | **3.5/10** | **5/10** |

## Overview

Consolidate dual config systems (server/config.ts and server/config/Configuration.ts) into a single validated config export, removing singleton pattern complexity while maintaining Zod validation and type safety.

## User Story

As a developer
I want a single, simple config system
So that I can access environment variables consistently without navigating multiple config abstractions

## Technical Approach

1. Merge workflow config into existing Configuration.ts schemas
2. Remove singleton class pattern, export validated object directly
3. Rename Configuration.ts → index.ts for cleaner imports
4. Update all 9 import sites to use unified pattern
5. Update documentation to reflect simplified approach

## Key Design Decisions

1. **Keep Zod validation**: Ensures fail-fast on missing required vars (JWT_SECRET) at startup
2. **Remove singleton**: Unnecessary complexity - validated object at module scope is sufficient
3. **Single import path**: All config accessed via `import { config } from '@/server/config'`

## Architecture

### File Structure
```
src/server/config/
├── index.ts          # Main config export (renamed from Configuration.ts)
├── schemas.ts        # Zod schemas (add workflow config)
└── types.ts          # TypeScript types
```

### Integration Points

**Server domain services**:
- `domain/workflow/services/engine/initializeWorkflowEngine.ts` - Change to unified config
- `domain/session/services/generateSessionName.ts` - Change import path
- `domain/workflow/services/generateRunNames.ts` - Change import path
- `domain/git/services/generateCommitMessage.ts` - Change import path

**Server infrastructure**:
- `index.ts` - Change import path
- `routes/settings.ts` - Change import path
- `plugins/auth.ts` - Change import path
- `domain/workflow/services/engine/steps/createAiStep.ts` - Change import path

## Implementation Details

### 1. Config Schema Consolidation

Add workflow configuration schema to existing server config schemas. Includes Inngest-specific settings with sensible defaults matching current behavior.

**Key Points**:
- Add WorkflowConfigSchema with all 5 Inngest settings
- Maintain existing defaults (enabled=true, devMode=true)
- Use z.coerce.boolean() for string env var conversion

### 2. Simplified Config Export

Replace singleton class with direct validated object export. Removes getInstance() pattern while keeping validation benefits.

**Key Points**:
- Remove Configuration class entirely
- Export `config` as const parsed from ConfigSchema
- Keep reset() function for testing
- All env access happens in one place

### 3. Import Path Updates

Update all 9 files using either config system to use unified import pattern.

**Key Points**:
- Change all to: `import { config } from '@/server/config'`
- Access via dot notation: `config.server.port`, `config.workflow.appId`
- Type safety preserved through Zod inference

## Files to Create/Modify

### New Files (0)

No new files required.

### Modified Files (12)

1. `apps/app/src/server/config/schemas.ts` - Add WorkflowConfigSchema
2. `apps/app/src/server/config/types.ts` - Add WorkflowConfig type
3. `apps/app/src/server/config/Configuration.ts` → `apps/app/src/server/config/index.ts` - Remove singleton, export validated object
4. `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts` - Update import
5. `apps/app/src/server/index.ts` - Update import path
6. `apps/app/src/server/routes/settings.ts` - Update import path
7. `apps/app/src/server/plugins/auth.ts` - Update import path
8. `apps/app/src/server/domain/session/services/generateSessionName.ts` - Update import path
9. `apps/app/src/server/domain/workflow/services/generateRunNames.ts` - Update import path
10. `apps/app/src/server/domain/git/services/generateCommitMessage.ts` - Update import path
11. `apps/app/src/server/domain/workflow/services/engine/steps/createAiStep.ts` - Update import
12. Delete: `apps/app/src/server/config.ts`

### Documentation Files (3)

1. `CLAUDE.md` - Update backend architecture section
2. `apps/app/CLAUDE.md` - Update config pattern examples
3. `apps/app/src/server/CLAUDE.md` - Update config usage examples

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Consolidate Config Files

**Phase Complexity**: 12 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] 1.1 [4/10] Add workflow config schema to config/schemas.ts
  - Add WorkflowConfigSchema with: enabled, appId, eventKey, devMode, memoizationDbPath, servePath
  - Use z.coerce.boolean() for boolean fields to handle string env vars
  - Set defaults: enabled=true, devMode=true, appId="sourceborn-workflows", servePath="/api/workflows/inngest"
  - File: `apps/app/src/server/config/schemas.ts`

- [ ] 1.2 [3/10] Add WorkflowConfig type export to config/types.ts
  - Add: `export type WorkflowConfig = AppConfig['workflow']`
  - File: `apps/app/src/server/config/types.ts`

- [ ] 1.3 [5/10] Simplify Configuration.ts and rename to index.ts
  - Remove Configuration class and singleton pattern
  - Create rawConfig object with workflow section added
  - Export validated config: `export const config = ConfigSchema.parse(rawConfig)`
  - Keep reset() function for testing: `export function reset() { ... }`
  - Remove getInstance() and class exports
  - Rename file: `apps/app/src/server/config/Configuration.ts` → `apps/app/src/server/config/index.ts`
  - File: `apps/app/src/server/config/index.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Update Imports

**Phase Complexity**: 14 points (avg 3.5/10)

<!-- prettier-ignore -->
- [ ] 2.1 [4/10] Update initializeWorkflowEngine.ts import and usage
  - Change: `import config from "@/server/config"` → `import { config } from '@/server/config'`
  - Update usage: `config.workflow.appId` (no change needed in usage pattern)
  - File: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts`

- [ ] 2.2 [3/10] Update server infrastructure imports (index.ts, routes/settings.ts, plugins/auth.ts)
  - Change all: `import { config } from '@/server/config/Configuration'` → `import { config } from '@/server/config'`
  - Usage pattern stays same: `config.get('server')` → `config.server`
  - Files: `apps/app/src/server/index.ts`, `apps/app/src/server/routes/settings.ts`, `apps/app/src/server/plugins/auth.ts`

- [ ] 2.3 [4/10] Update domain service imports (4 files)
  - Change all: `import { config } from '@/server/config/Configuration'` → `import { config } from '@/server/config'`
  - Update usage: `config.get('apiKeys').anthropicApiKey` → `config.apiKeys.anthropicApiKey`
  - Files:
    - `apps/app/src/server/domain/session/services/generateSessionName.ts`
    - `apps/app/src/server/domain/workflow/services/generateRunNames.ts`
    - `apps/app/src/server/domain/git/services/generateCommitMessage.ts`
    - `apps/app/src/server/domain/workflow/services/engine/steps/createAiStep.ts`

- [ ] 2.4 [3/10] Delete old config.ts file
  - Remove: `apps/app/src/server/config.ts`
  - Verify no references remain with: `grep -r "from.*server/config['\"]" apps/app/src/server --exclude-dir=node_modules`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Update Documentation

**Phase Complexity**: 9 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] 3.1 [3/10] Update root CLAUDE.md backend architecture section
  - Update "Backend Architecture" → "Key Principles" to mention: "Centralized config - never access process.env directly"
  - Add config import example: `import { config } from '@/server/config'`
  - File: `CLAUDE.md`

- [ ] 3.2 [4/10] Update apps/app/CLAUDE.md config pattern
  - Remove Configuration.ts singleton references
  - Update "Environment Variables" section with new pattern
  - Show example: `const port = config.server.port;` (not `config.get('server').port`)
  - Update "Quick Reference" → "Import paths" section
  - File: `apps/app/CLAUDE.md`

- [ ] 3.3 [2/10] Update apps/app/src/server/CLAUDE.md config examples
  - Update config import in "Quick Reference" section
  - Remove Configuration class references
  - File: `apps/app/src/server/CLAUDE.md`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new unit tests required - config module has no existing tests. Manual verification sufficient.

### Integration Tests

Verify server startup with missing/invalid env vars:
- Missing JWT_SECRET should fail with Zod error
- Invalid PORT should fail with Zod error
- Valid config should start successfully

### E2E Tests

Not applicable - infrastructure change only.

## Success Criteria

- [ ] Single config file at `server/config/index.ts`
- [ ] All 9 import sites updated to use unified pattern
- [ ] No references to old `server/config.ts` remain
- [ ] Server starts successfully with valid env vars
- [ ] Server fails fast with clear error on missing JWT_SECRET
- [ ] All config values accessible via dot notation (e.g., `config.server.port`)
- [ ] Documentation updated in all 3 CLAUDE.md files
- [ ] Type checking passes with no errors
- [ ] No singleton pattern remains

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Verify no old imports remain
grep -r "from.*server/config['\"]" apps/app/src/server --exclude-dir=node_modules
# Expected: Only matches for '@/server/config' (not '@/server/config/Configuration')

# Verify old config.ts deleted
ls apps/app/src/server/config.ts
# Expected: No such file or directory

# Build verification
pnpm --filter app build
# Expected: Successful build with no errors

# Start server (should fail without JWT_SECRET)
cd apps/app && JWT_SECRET="" pnpm dev:server
# Expected: Zod validation error about JWT_SECRET being required

# Start server (should succeed with JWT_SECRET)
cd apps/app && JWT_SECRET="test-secret-at-least-32-characters-long" pnpm dev:server
# Expected: Server starts on port 3456
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Check server logs: Should show "Workflow engine initialized" without errors
3. Verify: No console errors about missing config
4. Test edge cases:
   - Set invalid PORT (e.g., "abc") - should fail validation
   - Set empty JWT_SECRET - should fail validation
   - Set valid config - should start successfully
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- All config access uses dot notation: `config.server.port` not `config.get('server').port`
- Workflow engine initializes with config.workflow values
- Auth plugin uses config.jwt.secret
- No Configuration class imports remain

## Implementation Notes

### 1. Zod Coercion for Booleans

Use `z.coerce.boolean()` for workflow enabled/devMode fields since env vars are strings. Handles "true"/"false"/"1"/"0" correctly.

### 2. Backward Compatibility

All config values maintain same defaults as before:
- workflow.enabled: true (was `process.env.WORKFLOW_ENGINE_ENABLED !== "false"`)
- workflow.devMode: true (was `process.env.INNGEST_DEV_MODE !== "false"`)

### 3. Testing Reset Function

Keep `reset()` function for test isolation even though singleton removed. Tests may still need to reload config with different env vars.

## Dependencies

- zod (already installed)
- No new dependencies required

## References

- Existing config pattern: `apps/app/src/server/config/Configuration.ts`
- Old workflow config: `apps/app/src/server/config.ts`
- Zod documentation: https://zod.dev

## Next Steps

1. Run `/cmd:implement-spec 251113111725` to implement changes
2. Test server startup with valid and invalid env vars
3. Verify all import sites work correctly
4. Update documentation
5. Commit changes with message: "Simplify config system - remove singleton, consolidate files"
