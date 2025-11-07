# Step ID/Name DX Improvement

**Status**: draft
**Created**: 2025-01-05
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Simplify step API by accepting human-readable display name as first parameter, auto-generate slugified IDs and display names using `toId()` and `toName()` utilities. Remove manual `config.displayName` configuration.

## User Story

As a workflow developer
I want to write `step.annotation("Planning Phase", { ... })` instead of managing separate IDs and display names
So that I can focus on what the step does without manually converting between formats

## Technical Approach

**Simple Dual-Function Pattern:**
- `toId(idOrName)` - Always returns valid ID (slugified if needed)
- `toName(idOrName)` - Always returns display name (title-cased if needed)
- No format detection needed - each function handles both input formats
- No manual `config.displayName` override (removed for simplicity)

**Slugification Rules (toId):**
- If already kebab-case (no spaces, no uppercase) → return as-is
- Otherwise → lowercase, spaces/underscores → hyphens, strip non-ASCII, preserve numbers, collapse hyphens
- **Hard truncate to 64 chars**

**Display Name Rules (toName):**
- If has spaces or uppercase → return as-is (already a display name)
- Otherwise → split on hyphens, title-case each word, join with spaces

## Key Design Decisions

1. **Two simple utilities** - `toId()` and `toName()` instead of complex format detection
2. **No manual overrides** - Remove `config.displayName` field (only used in `createArtifactStep`)
3. **64-char ID limit** - Prevent extremely long IDs from annotations/paragraphs
4. **Hard truncation** - No hash suffixes, just truncate at 64 chars
5. **Preserve numbers** - Keep version numbers, dates in slugs (e.g., `"v2-migration"`)
6. **Strip non-ASCII** - Avoid encoding issues with unicode characters
7. **Each function self-contained** - No shared detection logic, each handles both formats independently

## Architecture

### File Structure

```
apps/web/src/server/domain/workflow/services/engine/
├── steps/
│   ├── utils/
│   │   ├── toId.ts                    # NEW: Convert idOrName → ID
│   │   ├── toId.test.ts               # NEW: toId tests
│   │   ├── toName.ts                  # NEW: Convert idOrName → display name
│   │   └── toName.test.ts             # NEW: toName tests
│   │
│   ├── createAnnotationStep.ts        # MODIFIED: Use toId/toName
│   ├── createAnnotationStep.test.ts   # MODIFIED: Update tests
│   ├── createGitStep.ts               # MODIFIED: Use toId/toName
│   ├── createGitStep.test.ts          # MODIFIED: Update tests
│   ├── createArtifactStep.ts          # MODIFIED: Use toId/toName, remove config.displayName
│   ├── createArtifactStep.test.ts     # MODIFIED: Update tests
│   ├── createCliStep.ts               # MODIFIED: Use toId/toName (if exists)
│   ├── createRunStep.ts               # MODIFIED: Use toId/toName (if needed)
│   └── createPhaseStep.ts             # MODIFIED: Use toId/toName (if needed)
```

### Integration Points

**apps/web/src/server/domain/workflow/services/engine/steps/utils/**:
- `toId.ts` - NEW: `idOrName → ID` conversion utility
- `toName.ts` - NEW: `idOrName → display name` conversion utility

**apps/web/src/server/domain/workflow/services/engine/steps/**:
- `createAnnotationStep.ts` - Use `toId(id)` and `toName(id)` at function start
- `createGitStep.ts` - Use `toId(id)` and `toName(id)` at function start
- `createArtifactStep.ts` - Use `toId(id)` and `toName(id)`, remove `config.displayName ?? id` fallback
- `createCliStep.ts` - Use `toId(id)` and `toName(id)` if step name tracking exists
- `createRunStep.ts` - Use `toId(id)` and `toName(id)` if step name tracking exists
- `createPhaseStep.ts` - Use `toId(id)` and `toName(id)` if applicable

## Implementation Details

### 1. toId Utility

Converts `idOrName` to valid ID format (kebab-case, 64 char max).

**Logic:**
- If already kebab-case (no spaces, no uppercase) → return as-is (maybe truncate)
- Otherwise → slugify: lowercase, spaces/underscores → hyphens, strip non-ASCII, preserve numbers, collapse hyphens
- **Hard truncate to 64 characters**

**Examples:**
```typescript
toId("Analyze Requirements")        // "analyze-requirements"
toId("analyze-requirements")        // "analyze-requirements" (no change)
toId("Process Data (2024)")         // "process-data-2024"
toId("Très  Long__Annotation!!!")   // "trs-long-annotation"
toId("A".repeat(100))               // "a".repeat(64) (truncated)
```

### 2. toName Utility

Converts `idOrName` to human-readable display name.

**Logic:**
- If has spaces OR uppercase → return as-is (already a display name)
- Otherwise → title-case: split on hyphens, capitalize each word, join with spaces
- **No truncation** (preserve full input)

**Examples:**
```typescript
toName("Analyze Requirements")      // "Analyze Requirements" (no change)
toName("analyze-requirements")      // "Analyze Requirements"
toName("process-data-2024")         // "Process Data 2024"
toName("v2-migration")              // "V2 Migration"
```

### 3. Step Function Updates

Update each step function to use `toId()` and `toName()` at the start:

**Before (createAnnotationStep.ts):**
```typescript
return async function annotation(id: string, config: AnnotationStepConfig): Promise<void> {
  const inngestStepId = generateInngestStepId(context, id);

  return await inngestStep.run(inngestStepId, async () => {
    // Uses 'id' directly...
  });
};
```

**After:**
```typescript
return async function annotation(idOrName: string, config: AnnotationStepConfig): Promise<void> {
  const id = toId(idOrName);
  const name = toName(idOrName);
  const inngestStepId = generateInngestStepId(context, id);

  return await inngestStep.run(inngestStepId, async () => {
    // Use 'name' for logging, events, display
    // Use 'id' for Inngest step ID generation
  });
};
```

**Before (createArtifactStep.ts):**
```typescript
return async function artifact(id: string, config: ArtifactStepConfig): Promise<ArtifactStepResult> {
  const name = config.displayName ?? id;  // Manual fallback
  const inngestStepId = generateInngestStepId(context, id);
  // ...
};
```

**After:**
```typescript
return async function artifact(idOrName: string, config: ArtifactStepConfig): Promise<ArtifactStepResult> {
  const id = toId(idOrName);
  const name = toName(idOrName);
  const inngestStepId = generateInngestStepId(context, id);
  // Remove config.displayName field entirely
  // ...
};
```

## Files to Create/Modify

### New Files (4)

1. `apps/web/src/server/domain/workflow/services/engine/steps/utils/toId.ts` - ID conversion utility
2. `apps/web/src/server/domain/workflow/services/engine/steps/utils/toId.test.ts` - toId tests
3. `apps/web/src/server/domain/workflow/services/engine/steps/utils/toName.ts` - Display name conversion utility
4. `apps/web/src/server/domain/workflow/services/engine/steps/utils/toName.test.ts` - toName tests

### Modified Files (8+)

1. `apps/web/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts` - Use toId/toName
2. `apps/web/src/server/domain/workflow/services/engine/steps/createAnnotationStep.test.ts` - Update tests
3. `apps/web/src/server/domain/workflow/services/engine/steps/createGitStep.ts` - Use toId/toName
4. `apps/web/src/server/domain/workflow/services/engine/steps/createGitStep.test.ts` - Update tests
5. `apps/web/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts` - Use toId/toName, remove config.displayName
6. `apps/web/src/server/domain/workflow/services/engine/steps/createArtifactStep.test.ts` - Update tests
7. `apps/web/src/server/domain/workflow/services/engine/steps/createCliStep.ts` - Use toId/toName (if applicable)
8. `apps/web/src/server/domain/workflow/services/engine/steps/createRunStep.ts` - Use toId/toName (if applicable)
9. `apps/web/src/server/domain/workflow/services/engine/steps/createPhaseStep.ts` - Use toId/toName (if applicable)
10. Any associated test files for above steps

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Create Utilities

<!-- prettier-ignore -->
- [x] create-to-id - Create toId utility function
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/utils/toId.ts`
  - Implement: if already kebab-case → return as-is; otherwise → slugify (lowercase, spaces → hyphens, strip non-ASCII, preserve numbers, collapse hyphens, truncate 64 chars)
  - Export as named function: `export function toId(idOrName: string): string`
- [x] test-to-id - Add comprehensive toId tests
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/utils/toId.test.ts`
  - Test cases: sentence case → slug, kebab-case → no change, special chars, unicode, numbers, long strings (>64 chars), edge cases
- [x] create-to-name - Create toName utility function
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/utils/toName.ts`
  - Implement: if has spaces/uppercase → return as-is; otherwise → title-case (split hyphens, capitalize, join spaces)
  - Export as named function: `export function toName(idOrName: string): string`
- [x] test-to-name - Add comprehensive toName tests
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/utils/toName.test.ts`
  - Test cases: sentence case → no change, kebab-case → title case, numbers, single word, empty string

#### Completion Notes

- Created `toId()` utility that converts display names to slugified IDs with 64-char truncation
- Created `toName()` utility that converts kebab-case IDs to title-case display names
- Both functions are idempotent (applying twice produces same result)
- Comprehensive test coverage including edge cases, unicode handling, number preservation
- All 67 test cases passing for both utilities

### Task Group 2: Update Step Functions

<!-- prettier-ignore -->
- [x] update-annotation-step - Update createAnnotationStep to use toId/toName
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts`
  - Change parameter: `id` → `idOrName`
  - Add at function start: `const id = toId(idOrName); const name = toName(idOrName);`
  - Use `id` for Inngest step ID generation
  - Use `name` for logging, events, WebSocket broadcasts
- [x] update-annotation-tests - Update createAnnotationStep tests
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createAnnotationStep.test.ts`
  - Test both formats: `annotation("Planning Phase", { ... })` and `annotation("planning-phase", { ... })`
  - Verify correct ID used for Inngest, correct name used for display
- [x] update-git-step - Update createGitStep to use toId/toName
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createGitStep.ts`
  - Change parameter: `id` → `idOrName`
  - Add: `const id = toId(idOrName); const name = toName(idOrName);`
- [x] update-git-tests - Update createGitStep tests
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createGitStep.test.ts`
  - Test both formats
- [x] update-artifact-step - Update createArtifactStep to use toId/toName
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts`
  - Change parameter: `id` → `idOrName`
  - Add: `const id = toId(idOrName); const name = toName(idOrName);`
  - **Remove** `config.displayName ?? id` fallback logic (line 55)
  - Use `name` directly everywhere
- [x] update-artifact-tests - Update createArtifactStep tests
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createArtifactStep.test.ts`
  - Test both formats
  - Remove tests for `config.displayName` field

#### Completion Notes

- Updated all three step functions (annotation, git, artifact) to accept idOrName parameter
- Converted to ID and name at function start using toId() and toName() utilities
- Added comprehensive integration tests verifying both sentence case and kebab-case work identically
- All tests verify same Inngest step ID generated for both input formats
- Removed config.displayName usage from createArtifactStep (now uses toName(idOrName) directly)

### Task Group 3: Update Type Definitions (if needed)

<!-- prettier-ignore -->
- [x] remove-display-name - Remove displayName from ArtifactStepConfig
  - File: `@repo/workflow-sdk` or wherever `ArtifactStepConfig` is defined
  - Remove `displayName?: string` field from interface

#### Completion Notes

- Removed displayName field from ArtifactStepConfig in packages/workflow-sdk/src/types/steps.ts
- Updated JSDoc comment for artifact() method to reflect new behavior

## Testing Strategy

### Unit Tests

**`toId.test.ts`** - ID conversion edge cases:

```typescript
describe('toId', () => {
  it('converts sentence case to slug', () => {
    expect(toId('Analyze Requirements')).toBe('analyze-requirements');
  });

  it('leaves kebab-case unchanged', () => {
    expect(toId('analyze-requirements')).toBe('analyze-requirements');
  });

  it('preserves numbers', () => {
    expect(toId('Process Data 2024')).toBe('process-data-2024');
  });

  it('strips non-ASCII characters', () => {
    expect(toId('Très bien')).toBe('trs-bien');
  });

  it('collapses multiple hyphens', () => {
    expect(toId('Too   Many---Spaces')).toBe('too-many-spaces');
  });

  it('truncates to 64 characters', () => {
    const longString = 'A'.repeat(100);
    expect(toId(longString)).toHaveLength(64);
  });

  it('handles edge cases', () => {
    expect(toId('')).toBe('');
    expect(toId('   ')).toBe('');
    expect(toId('!!!')).toBe('');
  });
});
```

**`toName.test.ts`** - Display name conversion:

```typescript
describe('toName', () => {
  it('leaves sentence case unchanged', () => {
    expect(toName('Analyze Requirements')).toBe('Analyze Requirements');
  });

  it('converts kebab-case to title case', () => {
    expect(toName('analyze-requirements')).toBe('Analyze Requirements');
  });

  it('preserves numbers', () => {
    expect(toName('process-data-2024')).toBe('Process Data 2024');
  });

  it('handles single word', () => {
    expect(toName('analyze')).toBe('Analyze');
  });

  it('handles empty string', () => {
    expect(toName('')).toBe('');
  });
});
```

### Integration Tests

**`createAnnotationStep.test.ts`** - Step function integration:

```typescript
describe('createAnnotationStep with toId/toName', () => {
  it('accepts sentence case', async () => {
    const step = createAnnotationStep(context, inngestStep);
    await step('Planning Phase', { message: 'Starting planning' });

    // Verify Inngest step ID is slugified
    expect(inngestStep.run).toHaveBeenCalledWith(
      expect.stringContaining('planning-phase'),
      expect.any(Function)
    );
  });

  it('accepts kebab-case', async () => {
    const step = createAnnotationStep(context, inngestStep);
    await step('planning-phase', { message: 'Starting planning' });

    // Same Inngest step ID
    expect(inngestStep.run).toHaveBeenCalledWith(
      expect.stringContaining('planning-phase'),
      expect.any(Function)
    );
  });

  it('both formats produce same result', async () => {
    const step = createAnnotationStep(context, inngestStep);

    await step('Planning Phase', { message: 'Message 1' });
    await step('planning-phase', { message: 'Message 2' });

    // Should use same Inngest step ID for both calls
    const calls = inngestStep.run.mock.calls;
    expect(calls[0][0]).toBe(calls[1][0]); // Same step ID
  });
});
```

## Success Criteria

- [ ] toId converts display names to valid IDs (lowercase, hyphens, 64 char max)
- [ ] toId leaves kebab-case unchanged (idempotent for IDs)
- [ ] toName converts IDs to readable names (title case, spaces)
- [ ] toName leaves sentence case unchanged (idempotent for names)
- [ ] Both input formats produce identical Inngest step IDs
- [ ] IDs truncated to 64 characters for long inputs
- [ ] Numbers preserved in slugs (e.g., "2024", "v2")
- [ ] Non-ASCII characters stripped cleanly
- [ ] All tests pass (unit + integration)
- [ ] Type checking passes without errors
- [ ] `config.displayName` removed from ArtifactStepConfig
- [ ] No breaking changes to step function behavior (only parameter name change)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web
pnpm build
# Expected: Clean build, no errors

# Type checking
cd ../..
pnpm check-types
# Expected: No type errors in apps/web

# Unit tests
cd apps/web
pnpm test
# Expected: All tests pass, including new toId/toName utility tests

# Test specific files
pnpm vitest run src/server/domain/workflow/services/engine/steps/utils/toId.test.ts
pnpm vitest run src/server/domain/workflow/services/engine/steps/utils/toName.test.ts
pnpm vitest run src/server/domain/workflow/services/engine/steps/createAnnotationStep.test.ts
```

**Manual Verification:**

1. Start web app: `pnpm dev`
2. Create a test workflow via API or UI
3. Use both formats in workflow steps:
   ```typescript
   // In Inngest function
   await step.annotation("Planning Phase", { message: "Starting" });
   await step.annotation("planning-phase", { message: "Same step" });

   await step.git("Create Commit", { operation: "commit", message: "Test" });
   await step.git("create-commit", { operation: "commit", message: "Same" });
   ```
4. Check database: Verify `inngest_step_id` is slugified, `name` is human-readable
5. Check WebSocket events: Verify correct names displayed in UI

**Feature-Specific Checks:**

- Sentence case → ID: `"Planning Phase"` → `"planning-phase"`
- Kebab-case → Name: `"planning-phase"` → `"Planning Phase"`
- Long strings truncated: `"A".repeat(100)` → ID length === 64
- Numbers preserved: `"Process v2 Data"` → `"process-v2-data"`
- Special chars removed: `"Très!! Bien__"` → `"trs-bien"`
- `config.displayName` no longer used in artifact steps

## Implementation Notes

### 1. Format Detection Algorithm

Detection is simple but robust:

```typescript
function isDisplayNameFormat(input: string): boolean {
  // If contains spaces OR uppercase letters → display name
  return /[A-Z\s]/.test(input);
}
```

**Edge Cases:**
- All lowercase, no spaces → ID format (e.g., `"analyze"`)
- Mixed case, no spaces → Display name format (e.g., `"AnalyzeData"`)
- Numbers only → ID format (e.g., `"2024"`)
- Empty string → Return `{ id: '', displayName: '' }`

### 2. Truncation Strategy

Hard truncate at 64 characters (no hash suffix):

**Rationale:**
- Simplicity over uniqueness guarantees
- Collision risk acceptable (user controls input, won't create colliding names)
- Hash suffixes reduce readability
- 64 chars sufficient for descriptive step names

**Example:**
```typescript
const longInput = "This is an extremely long annotation that describes what the step does in great detail and exceeds the maximum allowed length";

slugify(longInput);
// "this-is-an-extremely-long-annotation-that-describes-what-th"
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (64 chars)
```

### 3. Title-Case Implementation

Simple split-map-join approach:

```typescript
function toDisplayName(id: string): string {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
```

**Limitations:**
- Doesn't handle special cases like "ID" → "Id" (acceptable trade-off)
- Lowercase rest of word (e.g., "API" → "Api")
- No stop-word handling (e.g., "the", "a", "of")

## Dependencies

- No new dependencies required
- Uses existing Node.js string methods
- TypeScript 5.9.x (already in project)

## Timeline

| Task                          | Estimated Time |
| ----------------------------- | -------------- |
| Create utilities (toId, toName) | 45 minutes |
| Update step functions (annotation, git, artifact) | 1 hour |
| Update type definitions       | 15 minutes     |
| Write comprehensive tests     | 45 minutes     |
| Update workflow definitions   | 15 minutes     |
| **Total**                     | **2-3 hours**  |

## References

- URL slugification best practices: https://stackoverflow.com/questions/427102
- Inngest step ID documentation: https://www.inngest.com/docs/features/inngest-functions/steps-workflows
- Slug length recommendations: https://moz.com/learn/seo/url

## Next Steps

1. Implement `toId()` utility with comprehensive tests
2. Implement `toName()` utility with tests
3. Update `createAnnotationStep`, `createGitStep`, `createArtifactStep` to use toId/toName
4. Remove `config.displayName` field from ArtifactStepConfig
5. Update all step function tests to use new API
6. Update workflow definitions in `.agent/workflows/definitions/` to use new syntax
7. Run full test suite and verify no regressions
8. Manual testing with live workflow run
