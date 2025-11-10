# Pre-1.0 Architecture Cleanup & Refactor

**Status**: draft
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 191 points
**Phases**: 4
**Tasks**: 22
**Overall Avg Complexity**: 8.7/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: MUST FIX (P0) | 5 | 31 | 6.2/10 | 8/10 |
| Phase 2: HIGH VALUE (P1) | 6 | 78 | 13.0/10 | 9/10 |
| Phase 3: POLISH (P2-P3) | 6 | 59 | 9.8/10 | 9/10 |
| Phase 4: DOCUMENTATION | 5 | 23 | 4.6/10 | 6/10 |
| **Total** | **22** | **191** | **8.7/10** | **9/10** |

## Overview

Comprehensive architecture cleanup addressing 22 issues identified in pre-1.0 audit: fix import violations (61 files), remove dead code, eliminate duplication, improve schema organization, add missing tests, and document patterns. Ensures codebase follows documented conventions and is production-ready for 1.0 release.

## User Story

As a developer on the team
I want a clean, well-organized codebase that follows documented conventions
So that I can navigate the code easily, understand patterns quickly, and make changes confidently without introducing bugs or violating architecture principles

## Technical Approach

Execute systematic cleanup in 4 phases prioritized by impact: (1) Fix critical architecture violations (imports, dead code), (2) Improve quality (N+1 queries, tests, type safety), (3) Polish remaining issues (type consolidation, error handling), (4) Document patterns and exceptions. All changes automated where possible, with comprehensive verification after each phase.

## Key Design Decisions

1. **Automated Import Refactoring**: Use find/replace patterns for 61 files to ensure consistency and speed
2. **Phased Execution**: Address P0 issues first to unblock other work, then quality improvements, then polish
3. **Test-First for N+1 Queries**: Add tests before fixing to ensure regressions caught
4. **Schema File Split**: Break large barrels into individual files following domain service pattern
5. **Delete vs Archive**: Delete dead code outright (tests verified elsewhere) rather than archiving

## Architecture

### File Structure

```
apps/app/src/
├── server/
│   ├── domain/
│   │   ├── workflow/services/engine/steps/   # 31 files to fix
│   │   ├── project/schemas/                  # Split 193-line barrel
│   │   ├── git/schemas/                      # Split 147-line barrel
│   │   └── auth/services/                    # Delete empty directory
│   └── services/                             # DELETE entire directory
├── client/
│   └── pages/projects/workflows/             # 30 files to fix
└── shared/
    ├── types/                                # Audit 15 files for duplicates
    └── schemas/                              # Document organization rules
```

### Integration Points

**Build System**:
- `turbo.json` - No changes
- `tsconfig.json` - No changes (imports already configured)

**Testing**:
- Add route integration tests
- Add workflow E2E tests
- Move orphaned tests to domain locations

**Documentation**:
- `CLAUDE.md` - Add schema organization, error handling, exception docs

## Implementation Details

### 1. Import Pattern Fixes

Replace all relative imports (`../../../`, `./`, `../`) with `@/` path aliases across 61 files in workflow engine and client components. This follows documented architecture rule and improves refactorability.

**Key Points**:
- Workflow engine: 31 files using `../../../` patterns
- Client workflows: 30 files using `./` and `../` patterns
- Automated find/replace with verification after each batch
- Remove all `.js` extensions from 12 additional files

### 2. Dead Code Removal

Delete legacy services directory (4 orphaned tests), empty auth domain, and nested `.agent` directory inside source code. Verify test coverage exists elsewhere before deletion.

**Key Points**:
- `/server/services/` contains only tests for deleted services
- `/domain/auth/services/index.ts` is empty placeholder
- `/domain/workflow/services/runs/.agent/` is development artifact

### 3. Schema Organization

Split large schema barrel files (193 and 147 lines) into individual files following domain service pattern. Document clear guidelines for when to use shared vs domain schemas.

**Key Points**:
- One schema per file (mirrors domain service pattern)
- Thin barrel exports in `index.ts`
- Separate type/schema exports in `/shared/types/`
- Document rules in CLAUDE.md

### 4. N+1 Query Audit & Fixes

Review all 18 `findMany` queries for missing `include`/`select` optimization. Add tests first, then fix queries. Recent fix in spec 15 shows pattern exists elsewhere.

**Key Points**:
- Test queries with realistic data sets
- Add proper `include` for related data
- Use `select` to limit fields where appropriate
- Measure query counts before/after

### 5. Testing Coverage

Add missing route integration tests (only 1 exists) and workflow E2E tests (none exist). Focus on critical paths: workflows CRUD, sessions, files, auth.

**Key Points**:
- Route tests: Verify HTTP endpoints work correctly
- E2E tests: Full workflow execution scenarios
- Cover error handling and edge cases
- Ensure tests run in CI

### 6. Type Safety Improvements

Audit and fix 15 `@ts-expect-error` usages, consolidate duplicate types with agent-cli-sdk, and reduce excessive `unknown`/`any` usage where proper types can be inferred.

**Key Points**:
- Replace `@ts-expect-error` with proper types
- Remove duplicate types between shared and SDK
- Document acceptable `unknown` usage (JSON, dynamic data)
- Keep `any` only for external library constraints

## Files to Create/Modify

### New Files (40+)

**Route Tests**:
1. `apps/app/src/server/routes/workflows.test.ts` - Workflow CRUD endpoints
2. `apps/app/src/server/routes/sessions.test.ts` - Session endpoints
3. `apps/app/src/server/routes/files.test.ts` - File operations endpoints
4. `apps/app/src/server/routes/auth.test.ts` - Auth endpoints

**E2E Tests**:
5. `apps/app/src/server/domain/workflow/services/engine/workflowExecution.e2e.test.ts` - Full execution

**Split Schema Files** (project domain - 20+ files):
6. `apps/app/src/server/domain/project/schemas/createProject.schema.ts`
7. `apps/app/src/server/domain/project/schemas/updateProject.schema.ts`
8. `apps/app/src/server/domain/project/schemas/projectResponse.schema.ts`
... (15+ more from splitting 193-line barrel)

**Split Schema Files** (git domain - 15+ files):
25. `apps/app/src/server/domain/git/schemas/gitStatus.schema.ts`
26. `apps/app/src/server/domain/git/schemas/gitCommit.schema.ts`
... (13+ more from splitting 147-line barrel)

### Modified Files (80+)

**Workflow Engine Imports (31 files)**:
1. `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`
2. `apps/app/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts`
3. `apps/app/src/server/domain/workflow/services/engine/steps/createBashStep.ts`
4. `apps/app/src/server/domain/workflow/services/engine/steps/createConditionalStep.ts`
5. `apps/app/src/server/domain/workflow/services/engine/steps/createLoopStep.ts`
... (26+ more step files)

**Client Workflow Imports (30 files)**:
32. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowExecution.ts`
33. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowStore.ts`
34. `apps/app/src/client/pages/projects/workflows/components/WorkflowBuilder.tsx`
... (27+ more component/hook files)

**Import Extension Removal (12 files)**:
62. `apps/app/src/cli/commands/init.ts`
63. `apps/app/src/cli/commands/run.ts`
64. `apps/app/src/client/pages/projects/sessions/components/ChatPromptInputSlashCommands.tsx`
... (9+ more)

**N+1 Query Fixes (18 files)**:
74. `apps/app/src/server/routes/workflows.ts`
75. `apps/app/src/server/domain/workflow/services/runs/getWorkflowRuns.ts`
76. `apps/app/src/server/domain/session/services/getSessions.ts`
... (15+ more)

**Type Safety (15 files)**:
92. Various files with `@ts-expect-error` - replace with proper types

**Documentation**:
93. `CLAUDE.md` - Add schema organization, error handling standards, exceptions

**Index Files**:
94. `apps/app/src/server/domain/project/schemas/index.ts` - Convert to thin barrel
95. `apps/app/src/server/domain/git/schemas/index.ts` - Convert to thin barrel
96. `apps/app/src/shared/types/index.ts` - Separate type/schema exports

### Deleted Files (10+)

1. `apps/app/src/server/services/agentSession.test.ts`
2. `apps/app/src/server/services/git.service.test.ts`
3. `apps/app/src/server/services/projectSync.test.ts`
4. `apps/app/src/server/services/slashCommand.test.ts`
5. `apps/app/src/server/domain/auth/services/index.ts`
6-10. Entire `/server/services/` directory
11-15. Entire `/domain/workflow/services/runs/.agent/` directory
16+. Duplicate types identified in shared/SDK audit

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: MUST FIX (P0 Critical Architecture Violations)

**Phase Complexity**: 31 points (avg 6.2/10)

<!-- prettier-ignore -->
- [ ] 1.1 [8/10] Fix workflow engine relative imports (31 files)
  - Use find/replace to convert `../../../` to `@/server/domain/workflow/services/`
  - Files: All in `/server/domain/workflow/services/engine/steps/`
  - Verify: `pnpm check-types` passes after changes
  - Test: Run workflow engine tests to ensure no breaks
- [ ] 1.2 [8/10] Fix client workflow relative imports (30 files)
  - Convert `./`, `../` to `@/client/pages/projects/workflows/`
  - Files: All in `/client/pages/projects/workflows/{hooks,components,stores}/`
  - Verify: `pnpm check-types` passes
  - Test: Frontend builds successfully
- [ ] 1.3 [4/10] Remove .js import extensions (12 files)
  - Find all imports ending with `.js` and remove extension
  - Files: CLI commands, workflow steps, client components
  - Command: `grep -r "from.*\.js'" apps/app/src/`
  - Verify: `pnpm check-types` passes
- [ ] 1.4 [2/10] Delete nested .agent directory
  - Remove: `/server/domain/workflow/services/runs/.agent/`
  - Verify directory doesn't contain important files first
  - Command: `rm -rf apps/app/src/server/domain/workflow/services/runs/.agent`
- [ ] 1.5 [9/10] Delete legacy services directory
  - Verify tests covered: Check `/domain/session/services/` has tests
  - Delete: `/server/services/` entire directory
  - Command: `rm -rf apps/app/src/server/services`
  - Verify: `pnpm test` still passes

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: HIGH VALUE (P1 Quality Improvements)

**Phase Complexity**: 78 points (avg 13.0/10)

<!-- prettier-ignore -->
- [ ] 2.1 [8/10] Split project schema barrel (193 lines → 20+ files)
  - Create individual schema files in `/domain/project/schemas/`
  - One schema per file (e.g., `createProject.schema.ts`)
  - Update `index.ts` to thin barrel with exports
  - Verify: All imports resolve, types work correctly
- [ ] 2.2 [7/10] Split git schema barrel (147 lines → 15+ files)
  - Create individual schema files in `/domain/git/schemas/`
  - Follow same pattern as project schemas
  - Update barrel exports
  - Verify: Build and type-check pass
- [ ] 2.3 [4/10] Separate type/schema exports in shared
  - Split `/shared/types/index.ts` exports
  - Separate: `export * from './types'` vs `export * from '../schemas'`
  - Document when to import from each
  - Verify: No circular dependencies introduced
- [ ] 2.4 [9/10] Audit and fix N+1 queries (18 findMany usages)
  - Add tests: Create realistic data sets, measure query counts
  - Review: Workflows, sessions, definitions queries
  - Fix: Add proper `include`/`select` optimizations
  - Files: `/routes/workflows.ts`, `/domain/workflow/services/runs/getWorkflowRuns.ts`, etc.
  - Measure: Before/after query counts
  - Verify: Tests pass, query counts reduced
- [ ] 2.5 [8/10] Add route integration tests (4 new test files)
  - Create: `workflows.test.ts`, `sessions.test.ts`, `files.test.ts`, `auth.test.ts`
  - Test: CRUD operations, auth, error handling
  - Cover: Critical paths and edge cases
  - Verify: `pnpm test` includes new tests, all pass
- [ ] 2.6 [8/10] Clean @ts-expect-error usage (15 files)
  - Audit: Each usage to determine if necessary
  - Replace: With proper types where possible
  - Document: Exceptions that must remain (external libs)
  - Verify: Type safety improved, build passes

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: POLISH (P2-P3 Production Improvements)

**Phase Complexity**: 59 points (avg 9.8/10)

<!-- prettier-ignore -->
- [ ] 3.1 [7/10] Audit and remove unused shared types (15 files)
  - Analysis: Find unused exports in `/shared/types/`
  - Compare: With agent-cli-sdk types for duplicates
  - Remove: Duplicate definitions, unused types
  - Update: Imports to use SDK types where appropriate
  - Verify: Build passes, no broken imports
- [ ] 3.2 [2/10] Delete empty auth domain
  - Remove: `/domain/auth/services/index.ts` (empty placeholder)
  - Consider: Delete entire `/domain/auth/` if no other files
  - Verify: No imports reference this directory
- [ ] 3.3 [9/10] Standardize error handling patterns
  - Audit: Current patterns (throw vs return null vs error object)
  - Decide: Standard pattern (recommend: throw for errors)
  - Document: Pattern and exceptions in CLAUDE.md
  - Refactor: Inconsistent services to use standard pattern
  - Update: Tests to match new patterns
- [ ] 3.4 [9/10] Add workflow E2E tests
  - Create: `workflowExecution.e2e.test.ts`
  - Test: Multi-step workflows (AI + Bash combinations)
  - Cover: Conditional logic, loops, error handling
  - Test: Full execution from trigger to completion
  - Verify: Tests pass, workflow engine robust
- [ ] 3.5 [7/10] Audit eslint-disable comments (72 files)
  - Review: Each `eslint-disable-next-line react-hooks/exhaustive-deps`
  - Verify: Stable function refs justify disables
  - Fix: Where proper deps can be added
  - Document: Pattern for store function exceptions
- [ ] 3.6 [7/10] Reduce unknown/any type usage
  - Audit: 37 `unknown` and 14 `any` usages
  - Categorize: JSON data (acceptable) vs lazy typing (fix)
  - Replace: Lazy types with proper interfaces
  - Document: Acceptable unknown usage (dynamic data, JSON)
  - Verify: Type safety improved

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: DOCUMENTATION (Knowledge Capture)

**Phase Complexity**: 23 points (avg 4.6/10)

<!-- prettier-ignore -->
- [ ] 4.1 [6/10] Document schema organization rules
  - Add to CLAUDE.md: When to use `/shared/schemas/` vs `/domain/*/schemas/`
  - Rule: Cross-cutting (workflow, events) → shared
  - Rule: Domain-specific → domain schemas
  - Include: Examples of each
  - Document: Barrel file patterns (thin exports only)
- [ ] 4.2 [3/10] Document CLI console.log exception
  - Add to CLAUDE.md: Why CLI uses console vs server structured logging
  - Explain: CLI output expectations vs server logs
  - Clarify: When each pattern is appropriate
- [ ] 4.3 [6/10] Document workflow engine structure
  - Add navigation guide: Explain 5-level nesting
  - Describe: Purpose of each subdirectory (runs/, engine/, steps/, etc.)
  - Provide: Quick reference for finding specific functionality
- [ ] 4.4 [4/10] Document default export exception
  - Add to CLAUDE.md: React components can use default exports
  - Explain: Named exports preferred, but components are exception
  - Clarify: Pattern for pages vs reusable components
- [ ] 4.5 [4/10] Document error handling standards
  - Add to CLAUDE.md: Standard throw pattern for errors
  - Document: Exceptions where return null acceptable
  - Provide: Examples of each pattern
  - Include: Testing guidance for error scenarios

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**Existing tests to verify still pass**:
- All domain service tests
- Zustand store tests
- Workflow engine step tests
- React component tests

**New tests to add**:

**`workflows.test.ts`** - Route integration tests:
```typescript
describe('Workflow Routes', () => {
  it('should create workflow', async () => { ... });
  it('should list workflows', async () => { ... });
  it('should execute workflow', async () => { ... });
  it('should handle errors', async () => { ... });
});
```

**`workflowExecution.e2e.test.ts`** - Full workflow execution:
```typescript
describe('Workflow Execution E2E', () => {
  it('should execute multi-step workflow', async () => { ... });
  it('should handle conditional branching', async () => { ... });
  it('should execute loops', async () => { ... });
  it('should handle step failures', async () => { ... });
});
```

### Integration Tests

Route tests verify HTTP endpoints work correctly with database and domain services. Cover auth, CRUD operations, WebSocket connections, error responses.

### E2E Tests

Workflow E2E tests verify complete execution flow: definition → trigger → step execution → event emission → artifact creation → completion. Tests should use realistic scenarios (AI code review, multi-step automation, etc.).

## Success Criteria

- [ ] Zero relative imports - all use `@/` aliases
- [ ] Zero `.js` extensions in imports
- [ ] Legacy `/server/services/` directory deleted
- [ ] Nested `.agent/` directory removed from source
- [ ] Project schemas split into 20+ individual files
- [ ] Git schemas split into 15+ individual files
- [ ] N+1 queries fixed with tests proving improvement
- [ ] Route integration tests added (4+ test files)
- [ ] Workflow E2E tests added with full coverage
- [ ] @ts-expect-error reduced by 50%+ or documented
- [ ] Unused types removed, duplicates consolidated
- [ ] Error handling pattern standardized and documented
- [ ] All schema organization rules documented
- [ ] All architecture exceptions documented
- [ ] `pnpm check` passes (lint + type-check)
- [ ] `pnpm test` passes (all tests)
- [ ] `pnpm build` succeeds
- [ ] No breaking changes to existing functionality

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: 0 errors

# Linting
pnpm lint
# Expected: 0 errors, 0 warnings

# Build verification
pnpm build
# Expected: Successful build of all packages

# Unit tests
pnpm test
# Expected: All tests pass (including new route and E2E tests)

# Check for relative imports (should find none)
grep -r "from ['\"]\.\./" apps/app/src/server/domain/workflow/services/engine/
grep -r "from ['\"]\./" apps/app/src/client/pages/projects/workflows/
# Expected: No results

# Check for .js extensions (should find none)
grep -r "from.*\.js['\"]" apps/app/src/
# Expected: No results

# Verify deleted directories gone
ls apps/app/src/server/services/
ls apps/app/src/server/domain/workflow/services/runs/.agent/
# Expected: "No such file or directory" for both

# Verify schema files split
ls apps/app/src/server/domain/project/schemas/
ls apps/app/src/server/domain/git/schemas/
# Expected: 20+ and 15+ individual .schema.ts files respectively
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Verify: All features work (workflows, sessions, files)
4. Test: Create and execute workflow end-to-end
5. Test: Create session, send messages, view responses
6. Test: File operations (read, write, navigate)
7. Check console: No TypeScript errors, no runtime errors
8. Check logs: `tail -f apps/app/logs/app.log` - verify structured logging working

**Feature-Specific Checks:**

- Import changes: Verify IDE auto-complete works with `@/` aliases
- Schema split: Verify schemas can be imported individually
- N+1 fixes: Check database query logs show reduced query counts
- Route tests: Run individually to verify they work in isolation
- E2E tests: Run workflow execution test, verify full flow works
- Documentation: Read new CLAUDE.md sections, verify clarity

## Implementation Notes

### 1. Import Refactoring Automation

Use find/replace with these patterns for speed:

**Workflow engine**:
```bash
# Pattern 1: Two levels up
from "../../ → from "@/server/domain/workflow/services/

# Pattern 2: Utils from engine
from "../utils/ → from "@/server/domain/workflow/services/engine/utils/
```

**Client workflows**:
```bash
# Pattern 1: Same directory
from "./ → from "@/client/pages/projects/workflows/

# Pattern 2: Up one level
from "../ → from "@/client/pages/projects/workflows/
```

### 2. Schema Splitting Strategy

1. Read large barrel file
2. Identify each schema definition (const X = z.object...)
3. Create individual file with schema name
4. Export schema and inferred type
5. Update barrel to re-export all
6. Verify imports resolve

### 3. N+1 Query Testing Approach

Add test first to prove problem exists:
```typescript
it('should not cause N+1 queries', async () => {
  // Create test data with relations
  // Track query count
  // Call function
  // Assert: query count <= expected threshold
});
```

### 4. Backward Compatibility

All changes maintain API compatibility. Internal refactoring only - no breaking changes to:
- HTTP endpoints
- WebSocket events
- Database schema
- Public exports

### 5. Incremental Verification

After each phase:
1. Run `pnpm check-types`
2. Run `pnpm test`
3. Run `pnpm build`
4. Verify manually in running app

Don't proceed to next phase until current phase verified.

## Dependencies

- No new packages required
- Uses existing: Prisma, Vitest, Fastify, React, Zod
- Existing dev tools: ESLint, TypeScript, Turborepo

## References

- Architecture audit report (provided above)
- CLAUDE.md - Current architecture guidelines
- Domain-driven design pattern: `apps/app/CLAUDE.md`
- Import conventions: Root `CLAUDE.md` line 15-25
- Schema organization: To be documented in this spec

## Next Steps

1. Review and approve this spec
2. Execute Phase 1 (MUST FIX) - Critical violations (6-8 hours)
3. Verify Phase 1 complete with automated checks
4. Execute Phase 2 (HIGH VALUE) - Quality improvements (14-20 hours)
5. Verify Phase 2 with tests and manual testing
6. Execute Phase 3 (POLISH) - Production improvements (8-14 hours)
7. Execute Phase 4 (DOCUMENTATION) - Knowledge capture (2-3 hours)
8. Final verification: All automated checks + manual testing
9. Create PR with comprehensive description of changes
10. Post-merge: Monitor for any regressions in production
