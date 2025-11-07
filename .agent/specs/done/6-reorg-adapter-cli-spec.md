# Feature: Reorganize agent-cli-sdk to src/adapters/ + src/utils/

## What We're Building

Restructure the agent-cli-sdk package to use a more conventional and scalable directory organization by grouping all adapter implementations under `src/adapters/` and renaming `src/shared/` to `src/utils/`. This improves code organization, follows industry standards, and creates clearer semantic boundaries between adapter implementations and shared utilities.

## User Story

As a developer working with the agent-cli-sdk codebase
I want adapters grouped together and utilities clearly separated
So that the codebase is more navigable, maintainable, and follows industry-standard conventions

## Technical Approach

This is a pure structural refactor with zero behavioral changes. We'll move directories and update all import paths across source files, tests, and documentation. The public API remains completely unchanged - all exports from `src/index.ts` stay identical. TypeScript's compiler will ensure all imports are correctly updated.

## Files to Touch

### Existing Files

**Main exports:**
- `packages/agent-cli-sdk/src/index.ts` - Update adapter imports from `./claude` → `./adapters/claude`

**Claude adapter (7 files):**
- `packages/agent-cli-sdk/src/claude/index.ts` - Update imports: `../shared/` → `../../utils/`
- `packages/agent-cli-sdk/src/claude/parser.ts` - Update imports: `../shared/` → `../../utils/`
- `packages/agent-cli-sdk/src/claude/types.ts` - Update imports: `../shared/` → `../../utils/`
- `packages/agent-cli-sdk/src/claude/cli-args.ts` - Check and update imports if needed
- `packages/agent-cli-sdk/src/claude/cli-detector.ts` - Check and update imports if needed
- `packages/agent-cli-sdk/src/claude/image-handler.ts` - Check and update imports if needed
- `packages/agent-cli-sdk/src/claude/mcp-detector.ts` - Check and update imports if needed

**Codex adapter (6 files):**
- `packages/agent-cli-sdk/src/codex/index.ts` - Update imports: `../shared/` → `../../utils/`
- `packages/agent-cli-sdk/src/codex/parser.ts` - Update imports: `../shared/` → `../../utils/`
- `packages/agent-cli-sdk/src/codex/types.ts` - Update imports: `../shared/` → `../../utils/`
- `packages/agent-cli-sdk/src/codex/cli-args.ts` - Check and update imports if needed
- `packages/agent-cli-sdk/src/codex/cli-detector.ts` - Check and update imports if needed
- `packages/agent-cli-sdk/src/codex/events.ts` - Check and update imports if needed

**Cursor + Gemini adapters (2 files):**
- `packages/agent-cli-sdk/src/cursor/index.ts` - Update imports: `../shared/` → `../../utils/`
- `packages/agent-cli-sdk/src/gemini/index.ts` - Update imports: `../shared/` → `../../utils/`

**Unit tests (6 files):**
- `packages/agent-cli-sdk/tests/unit/claude/parser.test.ts` - Update imports
- `packages/agent-cli-sdk/tests/unit/claude/image-handler.test.ts` - Update imports
- `packages/agent-cli-sdk/tests/unit/claude/mcp-detector.test.ts` - Update imports
- `packages/agent-cli-sdk/tests/unit/shared/errors.test.ts` - Update imports: `../../../src/shared/` → `../../../src/utils/`
- `packages/agent-cli-sdk/tests/unit/shared/json-parser.test.ts` - Update imports
- `packages/agent-cli-sdk/tests/unit/shared/spawn.test.ts` - Update imports

**E2E tests (3 files):**
- `packages/agent-cli-sdk/tests/e2e/claude-e2e.test.ts` - Update imports
- `packages/agent-cli-sdk/tests/e2e/codex-e2e.test.ts` - Update imports
- `packages/agent-cli-sdk/tests/e2e/structured-output.e2e.test.ts` - Update imports

**Documentation:**
- `packages/agent-cli-sdk/CLAUDE.md` - Update directory structure diagram in Architecture section

### New Files

None - This is a pure reorganization with no new functionality.

## Implementation Plan

### Phase 1: Foundation

Create new directory structure and move files to their new locations. This establishes the new organization without breaking anything (files aren't imported yet at new paths).

### Phase 2: Core Implementation

Update all import statements in source files (adapters and main index) to reference the new paths. TypeScript compiler will validate all changes.

### Phase 3: Integration

Update test files and documentation to reflect the new structure. Run full test suite to ensure everything works correctly.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Create Directory Structure

<!-- prettier-ignore -->
- [x] Create adapters directory
        - `mkdir -p packages/agent-cli-sdk/src/adapters`
- [x] Create utils directory
        - `mkdir -p packages/agent-cli-sdk/src/utils`

#### Completion Notes

- Created `src/adapters/` directory for all adapter implementations
- Created `src/utils/` directory for shared utilities

### 2: Move Adapter Folders

<!-- prettier-ignore -->
- [x] Move claude adapter
        - `mv packages/agent-cli-sdk/src/claude packages/agent-cli-sdk/src/adapters/`
- [x] Move codex adapter
        - `mv packages/agent-cli-sdk/src/codex packages/agent-cli-sdk/src/adapters/`
- [x] Move cursor adapter
        - `mv packages/agent-cli-sdk/src/cursor packages/agent-cli-sdk/src/adapters/`
- [x] Move gemini adapter
        - `mv packages/agent-cli-sdk/src/gemini packages/agent-cli-sdk/src/adapters/`

#### Completion Notes

- Moved all 4 adapter implementations (claude, codex, cursor, gemini) to `src/adapters/`
- All adapter files and subdirectories preserved intact

### 3: Move Shared Utilities

<!-- prettier-ignore -->
- [x] Move shared files to utils
        - `mv packages/agent-cli-sdk/src/shared/* packages/agent-cli-sdk/src/utils/`
- [x] Remove old shared directory
        - `rmdir packages/agent-cli-sdk/src/shared`

#### Completion Notes

- Moved all utility files from `src/shared/` to `src/utils/`
- Removed empty `src/shared/` directory

### 4: Update Main Index Exports

<!-- prettier-ignore -->
- [x] Update adapter imports in src/index.ts
        - Change `from './claude'` → `from './adapters/claude'`
        - Change `from './codex'` → `from './adapters/codex'`
        - Change `from './cursor'` → `from './adapters/cursor'`
        - Change `from './gemini'` → `from './adapters/gemini'`
        - File: `packages/agent-cli-sdk/src/index.ts`

#### Completion Notes

- Updated all adapter imports and exports in main index.ts
- Changed all `./shared/` references to `./utils/`
- Updated event type imports from adapter subdirectories
- Updated getAdapter() function type annotations

### 5: Update Claude Adapter Imports

<!-- prettier-ignore -->
- [x] Update claude/index.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/claude/index.ts`
- [x] Update claude/parser.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/claude/parser.ts`
- [x] Update claude/types.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/claude/types.ts`

#### Completion Notes

- Updated all 3 Claude adapter files to use `../../utils/` instead of `../shared/`
- Changed imports for types, spawn, logging, errors, and json-parser utilities

### 6: Update Codex Adapter Imports

<!-- prettier-ignore -->
- [x] Update codex/index.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/codex/index.ts`
- [x] Update codex/parser.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/codex/parser.ts`
- [x] Update codex/types.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/codex/types.ts`

#### Completion Notes

- Updated all 3 Codex adapter files to use `../../utils/` instead of `../shared/`
- Changed imports for types, spawn, logging, errors, and json-parser utilities

### 7: Update Cursor and Gemini Adapter Imports

<!-- prettier-ignore -->
- [x] Update cursor/index.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/cursor/index.ts`
- [x] Update gemini/index.ts imports
        - Change all `../shared/` → `../../utils/`
        - File: `packages/agent-cli-sdk/src/adapters/gemini/index.ts`

#### Completion Notes

- Updated Cursor and Gemini stub adapters to use `../../utils/types`
- Both adapters only import ExecutionResponse type

### 8: Update Unit Test Imports

<!-- prettier-ignore -->
- [x] Update claude parser test
        - Change `../../../src/claude/` → `../../../src/adapters/claude/`
        - Change `../../../src/shared/` → `../../../src/utils/`
        - File: `packages/agent-cli-sdk/tests/unit/claude/parser.test.ts`
- [x] Update claude image-handler test
        - Change `../../../src/claude/` → `../../../src/adapters/claude/`
        - File: `packages/agent-cli-sdk/tests/unit/claude/image-handler.test.ts`
- [x] Update claude mcp-detector test
        - Change `../../../src/claude/` → `../../../src/adapters/claude/`
        - File: `packages/agent-cli-sdk/tests/unit/claude/mcp-detector.test.ts`
- [x] Rename test directory
        - `mv packages/agent-cli-sdk/tests/unit/shared packages/agent-cli-sdk/tests/unit/utils`
- [x] Update errors test
        - Change `../../../src/shared/` → `../../../src/utils/`
        - File: `packages/agent-cli-sdk/tests/unit/utils/errors.test.ts`
- [x] Update json-parser test
        - Change `../../../src/shared/` → `../../../src/utils/`
        - File: `packages/agent-cli-sdk/tests/unit/utils/json-parser.test.ts`
- [x] Update spawn test
        - Change `../../../src/shared/` → `../../../src/utils/`
        - File: `packages/agent-cli-sdk/tests/unit/utils/spawn.test.ts`

#### Completion Notes

- Renamed test directory from `tests/unit/shared` to `tests/unit/utils`
- Updated all Claude unit test imports to use `src/adapters/claude/`
- Updated all utils test imports to use `src/utils/`

### 9: Update E2E Test Imports

<!-- prettier-ignore -->
- [x] Update claude e2e test
        - Change `../../src/claude/cli-detector` → `../../src/adapters/claude/cli-detector`
        - File: `packages/agent-cli-sdk/tests/e2e/claude-e2e.test.ts`
- [x] Update codex e2e test (if it imports from src)
        - Check and update any direct adapter imports
        - File: `packages/agent-cli-sdk/tests/e2e/codex-e2e.test.ts`
- [x] Update structured-output e2e test (if it imports from src)
        - Check and update any direct adapter imports
        - File: `packages/agent-cli-sdk/tests/e2e/structured-output.e2e.test.ts`

#### Completion Notes

- Updated all 3 E2E test files to use `src/adapters/` paths
- Changed cli-detector imports for both Claude and Codex tests

### 10: Update Documentation

<!-- prettier-ignore -->
- [x] Update CLAUDE.md directory structure
        - Update the "Directory Structure" section in Architecture
        - Change structure diagram to show `adapters/` and `utils/` folders
        - File: `packages/agent-cli-sdk/CLAUDE.md`

#### Completion Notes

- Updated directory structure diagram to show new `src/adapters/` and `src/utils/` organization
- Updated reference to `shared/spawn.ts` to `utils/spawn.ts` in Adapter Lifecycle section

## Acceptance Criteria

**Must Work:**

- [ ] All TypeScript files compile without errors
- [ ] All unit tests pass
- [ ] All E2E tests pass (with RUN_E2E_TESTS=true)
- [ ] Build produces identical output bundle (same exports)
- [ ] No broken import paths anywhere in codebase
- [ ] Public API exports remain unchanged from src/index.ts

**Should Not:**

- [ ] Break any existing consumer code (external API unchanged)
- [ ] Introduce any runtime behavior changes
- [ ] Fail linting checks
- [ ] Have any remaining references to old paths

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd packages/agent-cli-sdk && pnpm check-types
# Expected: ✓ No TypeScript errors

# Linting
cd packages/agent-cli-sdk && pnpm lint
# Expected: ✓ No ESLint errors

# Unit tests
cd packages/agent-cli-sdk && pnpm test
# Expected: ✓ All unit tests pass

# Build verification
cd packages/agent-cli-sdk && pnpm build
# Expected: ✓ Build completes successfully, dist/ created

# Full check suite
cd packages/agent-cli-sdk && pnpm check
# Expected: ✓ Tests + type-check + lint all pass
```

**Manual Verification:**

1. Verify directory structure:
   ```bash
   ls -la packages/agent-cli-sdk/src/
   # Expected: adapters/, utils/, index.ts (no claude/, codex/, shared/)

   ls -la packages/agent-cli-sdk/src/adapters/
   # Expected: claude/, codex/, cursor/, gemini/

   ls -la packages/agent-cli-sdk/src/utils/
   # Expected: types.ts, errors.ts, spawn.ts, logging.ts, json-parser.ts
   ```

2. Search for old import paths:
   ```bash
   cd packages/agent-cli-sdk
   grep -r "from '../shared/" src/
   grep -r "from './shared/" src/
   grep -r "from './claude'" src/index.ts
   # Expected: No matches (all should be updated)
   ```

3. Verify test directory:
   ```bash
   ls -la packages/agent-cli-sdk/tests/unit/
   # Expected: claude/, utils/ (no shared/)
   ```

**Feature-Specific Checks:**

- Verify all adapter files moved: `src/adapters/` contains claude, codex, cursor, gemini
- Verify utils files moved: `src/utils/` contains all 5 utility files
- Verify old directories removed: No `src/shared/`, `src/claude/`, etc. at top level
- Verify import consistency: All adapters use `../../utils/`, main index uses `./adapters/`
- Check build output: `dist/index.js` and `dist/index.d.ts` export same symbols as before

## Definition of Done

- [ ] All tasks completed
- [ ] Tests passing (unit + e2e)
- [ ] Type checks passing
- [ ] Lint checks passing
- [ ] Build succeeds
- [ ] No console errors or warnings
- [ ] Code follows existing patterns
- [ ] Directory structure matches new organization
- [ ] Documentation updated
- [ ] No references to old paths remain

## Notes

**Important Considerations:**

- This is a zero-risk refactor - no logic changes, only file organization
- TypeScript compiler provides safety net for all import updates
- Public API is completely unchanged, so no breaking changes for consumers
- Can be reverted easily via git if needed (single commit recommended)
- Test suite validates that behavior is preserved

**Future Benefits:**

- Clearer separation of concerns (adapters vs utilities)
- More scalable for adding new adapters
- Follows industry-standard conventions (utils/ instead of shared/)
- Easier navigation for new contributors
- Better semantic grouping of related code

**Rollback Plan:**

If issues arise, rollback is straightforward:
```bash
git reset --hard HEAD~1  # If single commit
# Or manually move directories back and revert import changes
```
