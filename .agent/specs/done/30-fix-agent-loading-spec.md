# Fix Agent Session File Loading

**Status**: draft
**Created**: 2025-10-31
**Package**: apps/web
**Estimated Effort**: 1-2 hours

## Overview

Update the `syncProjects` functionality to ignore session files prefixed with `agent-` (e.g., `agent-64613bb1.jsonl`) during project and session synchronization. These files should be filtered out when reading JSONL session files from the `~/.claude/projects/` directory.

## User Story

As a developer
I want the sync process to ignore temporary agent session files
So that only valid user sessions are imported and displayed in the application

## Technical Approach

Add a private helper function `isValidSessionFile()` to filter out session files that start with `agent-` prefix. This function will be used in both the project sync service and the session sync service to ensure consistent filtering behavior across the codebase.

## Key Design Decisions

1. **Private Helper Functions**: Keep filtering logic local to each file (not exported) since the files are in different domain layers
2. **Simple String Check**: Use `!file.startsWith('agent-')` for clarity and performance
3. **Maintain Existing Logic**: Only add the prefix check, don't change existing `.jsonl` filtering
4. **Test Coverage**: Add tests to existing test files to verify filtering behavior

## Architecture

### File Structure
```
apps/web/src/server/
├── services/
│   ├── projectSync.ts          # Modify: Add helper + update filters
│   └── projectSync.test.ts     # Modify: Add filtering tests
└── domain/
    └── session/
        └── services/
            ├── syncProjectSessions.ts      # Modify: Add helper + update filter
            └── syncProjectSessions.test.ts # Create: Add filtering tests (if needed)
```

### Integration Points

**Project Sync Service**:
- `apps/web/src/server/services/projectSync.ts` - Add `isValidSessionFile()` helper and update 2 filter calls

**Session Sync Service**:
- `apps/web/src/server/domain/session/services/syncProjectSessions.ts` - Add `isValidSessionFile()` helper and update 1 filter call

## Implementation Details

### 1. Private Helper Function

Add a private helper function to each file that checks if a filename is a valid session file:

**Function Signature**:
```typescript
/**
 * Check if a file is a valid session file
 * Valid files must end with .jsonl and NOT start with "agent-"
 * @param filename - The filename to check
 * @returns True if valid session file, false otherwise
 */
function isValidSessionFile(filename: string): boolean {
  return filename.endsWith('.jsonl') && !filename.startsWith('agent-');
}
```

### 2. Update Filter Calls

Replace existing `.filter((file) => file.endsWith('.jsonl'))` calls with `.filter(isValidSessionFile)`.

**In projectSync.ts**:
- Line 38: Inside `extractProjectDirectory()` function
- Line 142: Inside `hasEnoughSessions()` function

**In syncProjectSessions.ts**:
- Line 43: Inside `syncProjectSessions()` function

## Files to Create/Modify

### New Files (0)

None - adding helper functions to existing files only

### Modified Files (2-3)

1. `apps/web/src/server/services/projectSync.ts` - Add `isValidSessionFile()` helper, update 2 filters
2. `apps/web/src/server/domain/session/services/syncProjectSessions.ts` - Add `isValidSessionFile()` helper, update 1 filter
3. `apps/web/src/server/services/projectSync.test.ts` - Add test cases for filtering behavior

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Add Helper Function to projectSync.ts

<!-- prettier-ignore -->
- [x] fix-agent-01 Add `isValidSessionFile()` private helper function
  - Add function after the existing `decodeProjectPath()` function (around line 20)
  - File: `apps/web/src/server/services/projectSync.ts`
  - Include JSDoc comment explaining the function purpose
- [x] fix-agent-02 Update filter in `extractProjectDirectory()` function
  - Replace `.filter((file) => file.endsWith(".jsonl"))` with `.filter(isValidSessionFile)`
  - Location: Line 38
  - File: `apps/web/src/server/services/projectSync.ts`
- [x] fix-agent-03 Update filter in `hasEnoughSessions()` function
  - Replace `.filter((file) => file.endsWith(".jsonl"))` with `.filter(isValidSessionFile)`
  - Location: Line 142
  - File: `apps/web/src/server/services/projectSync.ts`

#### Completion Notes

- Added `isValidSessionFile()` helper function after `decodeProjectPath()` at line 27
- Function checks that filename ends with `.jsonl` AND does not start with `agent-`
- Updated filter in `extractProjectDirectory()` at line 48 to use `isValidSessionFile`
- Updated filter in `hasEnoughSessions()` at line 152 to use `isValidSessionFile`
- All changes maintain existing logic while adding the agent- prefix filtering

### Task Group 2: Add Helper Function to syncProjectSessions.ts

<!-- prettier-ignore -->
- [x] fix-agent-04 Add `isValidSessionFile()` private helper function
  - Add function after imports, before the main exported function (around line 8)
  - File: `apps/web/src/server/domain/session/services/syncProjectSessions.ts`
  - Include JSDoc comment explaining the function purpose
- [x] fix-agent-05 Update filter in `syncProjectSessions()` function
  - Replace `.filter((file) => file.endsWith('.jsonl'))` with `.filter(isValidSessionFile)`
  - Location: Line 43
  - File: `apps/web/src/server/domain/session/services/syncProjectSessions.ts`

#### Completion Notes

- Added `isValidSessionFile()` helper function after imports at line 14
- Function is identical to the one in projectSync.ts (checks `.jsonl` extension and excludes `agent-` prefix)
- Updated filter in `syncProjectSessions()` at line 53 to use `isValidSessionFile`
- Changes maintain existing session syncing logic while filtering out agent-prefixed files

### Task Group 3: Add Test Coverage

<!-- prettier-ignore -->
- [x] fix-agent-06 Add test cases to projectSync.test.ts
  - Test: `isValidSessionFile` should accept valid JSONL files (e.g., `session-123.jsonl`)
  - Test: `isValidSessionFile` should reject files starting with `agent-` (e.g., `agent-64613bb1.jsonl`)
  - Test: `isValidSessionFile` should reject non-JSONL files (e.g., `readme.txt`)
  - Test: `isValidSessionFile` should accept files with `agent` in middle/end (e.g., `my-agent-session.jsonl`)
  - File: `apps/web/src/server/services/projectSync.test.ts`
  - Note: Since function is private, test through public API behavior

#### Completion Notes

- Added 4 new test cases to `hasEnoughSessions` test suite:
  - Test for ignoring `agent-` prefixed files (verifies they don't count toward session minimum)
  - Test for accepting files with "agent" in middle/end (e.g., `my-agent-session.jsonl`, `agent.jsonl`)
  - Test for not counting `agent-` files when determining if project has enough sessions
  - Integration test for `syncFromClaudeProjects` to verify agent- files are filtered during sync
- All tests verify behavior through public API (hasEnoughSessions, syncFromClaudeProjects)
- Tests cover edge cases: exactly 3 sessions (should skip), 4+ valid sessions with many agent- files (should import)

## Testing Strategy

### Unit Tests

**`apps/web/src/server/services/projectSync.test.ts`** - Verify filtering behavior:

```typescript
describe('syncFromClaudeProjects - agent file filtering', () => {
  it('should ignore session files starting with agent-', async () => {
    // Setup: Create mock directory with mixed files
    // - valid-session.jsonl
    // - agent-64613bb1.jsonl
    // - another-session.jsonl

    // Execute: syncFromClaudeProjects()

    // Assert: Only valid-session and another-session are synced
    // agent-64613bb1.jsonl is ignored
  });

  it('should accept files with agent in middle or end', async () => {
    // Setup: Create session file named my-agent-session.jsonl

    // Execute: syncFromClaudeProjects()

    // Assert: File is synced normally
  });
});

describe('hasEnoughSessions - agent file filtering', () => {
  it('should not count agent- prefixed files toward session minimum', async () => {
    // Setup: Create directory with 2 valid + 5 agent- prefixed files

    // Execute: hasEnoughSessions(projectName, 3)

    // Assert: Returns false (only 2 valid files, needs >3)
  });
});
```

### Integration Tests

Manual verification through the sync endpoints to ensure agent- prefixed files don't appear in the UI.

## Success Criteria

- [ ] Session files starting with `agent-` are filtered out during project sync
- [ ] Session files starting with `agent-` are filtered out during session sync
- [ ] Session files with `agent` in middle/end of filename still work (e.g., `my-agent.jsonl`)
- [ ] `hasEnoughSessions()` correctly excludes `agent-` files from count
- [ ] No type errors after implementation
- [ ] All existing tests pass
- [ ] New test coverage added for filtering behavior

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
pnpm test projectSync.test.ts
# Expected: All tests pass, including new filtering tests

# Run all tests
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Create test session files in `~/.claude/projects/test-project/`:
   ```bash
   touch ~/.claude/projects/test-project/valid-session.jsonl
   touch ~/.claude/projects/test-project/agent-12345.jsonl
   touch ~/.claude/projects/test-project/another-valid.jsonl
   ```

2. Start application: `pnpm dev`

3. Trigger project sync (via API or UI)

4. Verify in database or UI:
   - `valid-session.jsonl` appears in session list
   - `another-valid.jsonl` appears in session list
   - `agent-12345.jsonl` does NOT appear in session list

5. Check server logs: No errors related to file filtering

**Feature-Specific Checks:**

- Verify `agent-` prefixed files are ignored in `extractProjectDirectory()`
- Verify `agent-` prefixed files are ignored in `hasEnoughSessions()`
- Verify `agent-` prefixed files are ignored in `syncProjectSessions()`
- Test edge case: File named `agent.jsonl` should be accepted (doesn't start with `agent-`)
- Test edge case: File named `my-agent-session.jsonl` should be accepted

## Implementation Notes

### 1. Private Functions Per File

The helper function is duplicated in both files rather than shared because:
- Files are in different domain layers (services vs domain/session/services)
- Keeps each file self-contained
- Simple function that's easy to maintain separately
- No risk of logic drift since it's a single boolean check

### 2. Prefix vs Pattern Matching

Using simple `startsWith('agent-')` rather than regex or glob patterns because:
- Clear and explicit
- Fast string operation
- Easy to understand and maintain
- Matches the exact requirement

## Dependencies

No new dependencies required

## Timeline

| Task                          | Estimated Time |
|-------------------------------|----------------|
| Add helper to projectSync.ts  | 15 minutes     |
| Add helper to syncProjectSessions.ts | 15 minutes |
| Add test coverage             | 30 minutes     |
| Manual testing & verification | 15 minutes     |
| **Total**                     | **1-1.5 hours** |

## References

- User request: "syncProjects should ignore files prefixed with agent-, EG: agent-64613bb1"
- Clarification: "This is just at the session file level"
- Related files:
  - `apps/web/src/server/services/projectSync.ts`
  - `apps/web/src/server/domain/session/services/syncProjectSessions.ts`

## Next Steps

1. Exit plan mode and confirm implementation approach
2. Implement helper function in `projectSync.ts`
3. Implement helper function in `syncProjectSessions.ts`
4. Add test coverage
5. Run validation commands
6. Manual verification with test files
