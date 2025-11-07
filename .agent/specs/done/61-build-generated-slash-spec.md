# Build Generated Slash Commands with Argument Order

**Status**: draft
**Created**: 2025-01-06
**Package**: workflow-sdk, monorepo-wide
**Estimated Effort**: 2-3 hours

## Overview

Fix `buildSlashCommand()` to use frontmatter argument order instead of object property order by generating a `SlashCommandArgOrder` constant. Move generated file to `.agent/generated/` for clarity and easy imports from workflow definitions.

## User Story

As a workflow developer
I want to use `buildSlashCommand()` with type-safe arguments in any property order
So that the command string always has arguments in the correct positional order from `.claude/commands/*.md` frontmatter

## Technical Approach

Generate an additional `SlashCommandArgOrder` constant mapping command names to ordered argument name arrays. Update `buildSlashCommand()` to iterate arguments using this constant instead of `Object.values()`. Move output to `.agent/generated/slash-commands.ts` for clear separation and easy workflow imports.

## Key Design Decisions

1. **Codegen over Runtime Parsing**: Generate `SlashCommandArgOrder` constant at build time rather than parsing `.claude/commands/*.md` at runtime (performance, works in all environments)
2. **Single Generated File**: Keep types, constant, and function in one file (`slash-commands.ts`) since they're tightly coupled
3. **Output Location**: `.agent/generated/` instead of `packages/workflow-sdk/src/types/` to clearly mark as generated and simplify workflow definition imports
4. **Preserve Public API**: Re-export from `@repo/workflow-sdk` so external consumers don't need path changes

## Architecture

### File Structure

```
.agent/
  generated/
    slash-commands.ts          ← Generated output (new location)
    README.md                  ← Documents auto-generated files

packages/workflow-sdk/
  src/
    types/
      slash-commands.ts        ← Re-export from .agent/generated/ (updated)
      steps.ts                 ← Hand-written types (unchanged)
    utils/
      generateSlashCommandTypes.ts  ← Generator implementation (modified)
    cli/
      commands/
        generate-slash-types.ts     ← CLI command (update output path)

.agent/workflows/
  definitions/
    my-workflow.ts             ← Imports from ../generated/slash-commands
```

### Integration Points

**Type Generator**:
- `packages/workflow-sdk/src/utils/generateSlashCommandTypes.ts` - Add `SlashCommandArgOrder` generation, update `buildSlashCommand()` implementation

**CLI Commands**:
- `packages/workflow-sdk/src/cli/commands/generate-slash-types.ts` - Change default output path
- `packages/agent-workflows/src/cli/commands/generate-slash-types.ts` - Change default output path (if exists)

**Re-exports**:
- `packages/workflow-sdk/src/types/slash-commands.ts` - Update to re-export from `.agent/generated/`

**Workflow Definitions**:
- `.agent/workflows/definitions/*.ts` - Can import directly from `../generated/slash-commands`

## Implementation Details

### 1. SlashCommandArgOrder Constant Generation

Generate a const mapping of command names to ordered argument name arrays:

```typescript
export const SlashCommandArgOrder = {
  "/generate-prd": ["featurename", "context", "format"],
  "/audit": ["mode", "scope"],
  "/implement-spec": ["specNumberOrNameOrPath", "format"],
  // ... all commands
} as const;
```

**Key Points**:
- Use `cmd.arguments.map(arg => arg.name)` from parsed commands
- Array order matches frontmatter `argument-hint` order
- Exported as `const` with `as const` for type safety

### 2. Updated buildSlashCommand Implementation

Replace `Object.values(args)` iteration with `SlashCommandArgOrder[name]` lookup:

```typescript
export function buildSlashCommand<T extends SlashCommandName>(
  name: T,
  args: SlashCommandArgs[T]
): string {
  const parts: string[] = [name];
  const argOrder = SlashCommandArgOrder[name];

  for (const argName of argOrder) {
    const value = (args as Record<string, unknown>)[argName];
    if (value !== undefined && value !== null) {
      const escaped = String(value).replace(/'/g, "\\'");
      parts.push(`'${escaped}'`);
    }
  }

  return parts.join(" ");
}
```

**Key Points**:
- Iterate `argOrder` array (guaranteed correct sequence)
- Access `args[argName]` by key (order-independent)
- Preserve existing escape logic and null handling

### 3. Output Path Change

Change generator output from `packages/workflow-sdk/src/types/slash-commands.ts` to `.agent/generated/slash-commands.ts`:

**In `generateSlashCommandTypes.ts`:**
- Update default output path in CLI command
- Ensure `.agent/generated/` directory is created

**Benefits:**
- Clearly marked as generated code
- Easy imports from workflow definitions: `../generated/slash-commands`
- Separates generated from hand-written code

## Files to Create/Modify

### New Files (2)

1. `.agent/generated/slash-commands.ts` - Generated types, constant, and function
2. `.agent/generated/README.md` - Documents auto-generated files

### Modified Files (4)

1. `packages/workflow-sdk/src/utils/generateSlashCommandTypes.ts` - Add `SlashCommandArgOrder` generation, update `buildSlashCommand()` code
2. `packages/workflow-sdk/src/cli/commands/generate-slash-types.ts` - Change default output path to `.agent/generated/slash-commands.ts`
3. `packages/workflow-sdk/src/types/slash-commands.ts` - Change to re-export from `.agent/generated/slash-commands`
4. `CLAUDE.md` - Document `.agent/generated/` folder and regeneration workflow

### Deleted Files (1)

1. `packages/workflow-sdk/src/types/slash-commands.ts` (old generated file) - Replaced by re-export

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Create Directory Structure

<!-- prettier-ignore -->
- [x] mkdir-01: Create `.agent/generated/` directory
  - Command: `mkdir -p .agent/generated`
- [x] readme-01: Create `.agent/generated/README.md` documentation
  - File: `.agent/generated/README.md`
  - Content: Explain this folder contains auto-generated code, list files, show regeneration command

#### Completion Notes

- Created `.agent/generated/` directory for generated code separation
- Added README.md with regeneration instructions and import patterns

### Task Group 2: Update Type Generator

<!-- prettier-ignore -->
- [x] gen-01: Add `SlashCommandArgOrder` constant generation
  - File: `packages/workflow-sdk/src/utils/generateSlashCommandTypes.ts`
  - After line 46 (argsMapping generation), add argOrderMapping generation
  - Generate: `export const SlashCommandArgOrder = { ... } as const;`
  - Use: `commands.map(cmd => cmd.arguments.map(arg => arg.name))`
- [x] gen-02: Update `buildSlashCommand()` implementation in generator
  - File: `packages/workflow-sdk/src/utils/generateSlashCommandTypes.ts`
  - Lines 60-79 (buildFunction template string)
  - Replace `Object.values(args)` iteration with `SlashCommandArgOrder[name]` lookup
  - Add type assertion: `(args as Record<string, unknown>)[argName]`

#### Completion Notes

- Added argOrderMapping generation after argsMapping
- Updated buildSlashCommand to iterate argOrder array instead of Object.values
- Used type assertion for argName lookup to maintain type safety

### Task Group 3: Update CLI Output Path

<!-- prettier-ignore -->
- [x] cli-01: Update workflow-sdk CLI default output path
  - File: `packages/workflow-sdk/src/cli/commands/generate-slash-types.ts`
  - Find default output path assignment
  - Change to: `.agent/generated/slash-commands.ts`
  - Ensure directory creation: `await fs.mkdir('.agent/generated', { recursive: true })`
- [x] cli-02: Update agent-workflows CLI default output path (if exists)
  - File: `packages/agent-workflows/src/cli/commands/generate-slash-types.ts`
  - Same changes as cli-01
  - Skip if file doesn't exist

#### Completion Notes

- Updated workflow-sdk CLI to use `.agent/generated/slash-commands.ts` default output
- Updated agent-workflows CLI to use same default output path
- Directory creation already handled by mkdir in both CLIs

### Task Group 4: Regenerate Types

<!-- prettier-ignore -->
- [x] regen-01: Run type generation to create new file
  - Command: `cd packages/workflow-sdk && pnpm gen-slash-types`
  - Expected: Creates `.agent/generated/slash-commands.ts` with SlashCommandArgOrder constant
  - Verify: File contains `export const SlashCommandArgOrder = {`
- [x] regen-02: Verify generated constant has correct order
  - File: `.agent/generated/slash-commands.ts`
  - Check: `/generate-prd` has `["featurename", "context", "format"]`
  - Check: All commands have argument arrays matching frontmatter order

#### Completion Notes

- Successfully generated `.agent/generated/slash-commands.ts` with 22 commands
- Verified SlashCommandArgOrder constant present with correct structure
- Confirmed /generate-prd has ["featurename", "context", "format"] order
- buildSlashCommand function updated to use argOrder lookup

### Task Group 5: Update Re-exports

<!-- prettier-ignore -->
- [x] export-01: Update workflow-sdk re-export
  - File: `packages/workflow-sdk/src/types/slash-commands.ts`
  - Replace entire contents with: `export * from '../../../../.agent/generated/slash-commands';`
  - Verify import path is correct (4 levels up from src/types/)
- [x] export-02: Verify package exports still work
  - Command: `cd packages/workflow-sdk && pnpm build`
  - Expected: Build succeeds, dist/ contains types
  - Test import: `import { buildSlashCommand } from '@repo/workflow-sdk'`

#### Completion Notes

- Updated re-export to point to generated file
- 4-level path correct: src/types/ → src/ → workflow-sdk/ → packages/ → root/
- Build successful, exports working correctly

### Task Group 6: Update Documentation

<!-- prettier-ignore -->
- [x] doc-01: Document `.agent/generated/` in root CLAUDE.md
  - File: `CLAUDE.md`
  - Add section under "Architecture Overview" or create "Generated Files" section
  - Document: Purpose, contents, regeneration command
  - Example: "Run `pnpm gen-slash-types` after editing `.claude/commands/*.md`"
- [x] doc-02: Add workflow import example to CLAUDE.md
  - File: `CLAUDE.md`
  - Show import pattern: `import { buildSlashCommand } from '../generated/slash-commands'`
  - Show usage in workflow definition

#### Completion Notes

- Added "Generated Files" section under Module Resolution
- Documented regeneration command and import patterns
- Added usage example showing argument order preservation
- Updated Quick Reference with file location and common task

### Task Group 7: Test Argument Order Fix

<!-- prettier-ignore -->
- [x] test-01: Create test file for buildSlashCommand
  - File: `packages/workflow-sdk/src/utils/buildSlashCommand.test.ts`
  - Test: Arguments in wrong object order produce correct command string
  - Example: `buildSlashCommand('/generate-prd', { format: 'md', featurename: 'auth', context: 'OAuth' })`
  - Expected: `"/generate-prd 'auth' 'OAuth' 'md'"`
- [x] test-02: Test optional argument handling
  - Same file
  - Test: Missing optional args are skipped correctly
  - Example: `buildSlashCommand('/generate-prd', { featurename: 'auth' })`
  - Expected: `"/generate-prd 'auth'"`
- [x] test-03: Run tests
  - Command: `cd packages/workflow-sdk && pnpm test`
  - Expected: All tests pass

#### Completion Notes

- Created comprehensive test suite with 11 test cases
- Tests cover: order preservation, optional args, null handling, escaping, edge cases
- Tests verify kebab-case args and mixed defined/undefined args
- All 47 tests passed (10 new tests added)

## Testing Strategy

### Unit Tests

**`packages/workflow-sdk/src/utils/buildSlashCommand.test.ts`** - Tests buildSlashCommand with various argument orders:

```typescript
import { buildSlashCommand } from '.agent/generated/slash-commands';

describe('buildSlashCommand', () => {
  it('preserves frontmatter order regardless of object property order', () => {
    const result = buildSlashCommand('/generate-prd', {
      format: 'md',        // 3rd in frontmatter
      featurename: 'auth', // 1st in frontmatter
      context: 'OAuth'     // 2nd in frontmatter
    });

    expect(result).toBe("/generate-prd 'auth' 'OAuth' 'md'");
  });

  it('skips undefined optional arguments', () => {
    const result = buildSlashCommand('/generate-prd', {
      featurename: 'auth'
      // context and format omitted
    });

    expect(result).toBe("/generate-prd 'auth'");
  });

  it('escapes single quotes in arguments', () => {
    const result = buildSlashCommand('/generate-prd', {
      featurename: "user's profile",
      context: 'OAuth',
      format: 'md'
    });

    expect(result).toBe("/generate-prd 'user\\'s profile' 'OAuth' 'md'");
  });
});
```

### Integration Tests

**Manual Test**: Create a workflow definition that uses `buildSlashCommand`:

```typescript
// .agent/workflows/definitions/test-slash-command.ts
import { buildSlashCommand } from '../generated/slash-commands';

export default defineWorkflow({
  id: 'test-slash',
  trigger: 'workflow/test-slash'
}, async ({ step }) => {
  const cmd = buildSlashCommand('/generate-prd', {
    format: 'md',
    featurename: 'test',
    context: 'Test'
  });

  console.log('Generated command:', cmd);
  // Should output: "/generate-prd 'test' 'Test' 'md'"
});
```

## Success Criteria

- [ ] `SlashCommandArgOrder` constant generated for all commands
- [ ] `buildSlashCommand()` uses `SlashCommandArgOrder` instead of `Object.values()`
- [ ] Generated file located at `.agent/generated/slash-commands.ts`
- [ ] Re-export from `@repo/workflow-sdk` works correctly
- [ ] Workflow definitions can import from `../generated/slash-commands`
- [ ] Arguments in any object property order produce correct positional command string
- [ ] All existing tests pass
- [ ] New tests for argument order pass
- [ ] Type checking passes: `pnpm check-types`
- [ ] Build succeeds: `pnpm build`
- [ ] Documentation updated with regeneration workflow

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd packages/workflow-sdk && pnpm check-types
# Expected: No type errors

# Build verification
cd packages/workflow-sdk && pnpm build
# Expected: Successful build, dist/ contains slash-commands types

# Unit tests
cd packages/workflow-sdk && pnpm test
# Expected: All tests pass including new buildSlashCommand tests

# Regenerate types (idempotency check)
cd packages/workflow-sdk && pnpm gen-slash-types
# Expected: No git diff in .agent/generated/slash-commands.ts
```

**Manual Verification:**

1. Check generated file exists: `cat .agent/generated/slash-commands.ts`
2. Verify `SlashCommandArgOrder` constant is present
3. Verify `/generate-prd` has `["featurename", "context", "format"]` order
4. Create test workflow file in `.agent/workflows/definitions/test-slash.ts`
5. Import: `import { buildSlashCommand } from '../generated/slash-commands'`
6. Call with wrong property order: `buildSlashCommand('/generate-prd', { format: 'md', featurename: 'auth', context: 'OAuth' })`
7. Verify output: `"/generate-prd 'auth' 'OAuth' 'md'"`
8. Check no TypeScript errors in workflow file

**Feature-Specific Checks:**

- Verify all 20 slash commands have entries in `SlashCommandArgOrder`
- Verify argument order matches `.claude/commands/*.md` frontmatter
- Verify optional arguments (with `?` in TypeScript type) are handled correctly
- Verify commands with no arguments have empty arrays in `SlashCommandArgOrder`

## Implementation Notes

### 1. Import Path Depth

The re-export path `'../../../../.agent/generated/slash-commands'` requires exactly 4 `../` because:
- `packages/workflow-sdk/src/types/slash-commands.ts` (file location)
- Up 1: `packages/workflow-sdk/src/`
- Up 2: `packages/workflow-sdk/`
- Up 3: `packages/`
- Up 4: repository root (where `.agent/` is located)

Verify this path works correctly after implementation.

### 2. Argument Order Preservation

The parser (`parseSlashCommands.ts`) already maintains argument order from frontmatter. We're just surfacing this order to runtime via the generated constant.

### 3. Type Safety for argName Lookup

Using `(args as Record<string, unknown>)[argName]` is necessary because TypeScript interface keys aren't iterable at runtime. This is safe because:
- `argOrder` comes from the same source as the interface definition
- If a typo exists, it will appear in both places (consistent failure)
- Type checking ensures `args` matches `SlashCommandArgs[T]`

## Dependencies

- No new dependencies required
- Uses existing: `gray-matter` (already used for parsing frontmatter)

## Timeline

| Task                      | Estimated Time |
| ------------------------- | -------------- |
| Directory setup           | 15 min         |
| Update type generator     | 30 min         |
| Update CLI output paths   | 15 min         |
| Regenerate types          | 5 min          |
| Update re-exports         | 15 min         |
| Documentation             | 20 min         |
| Testing                   | 30 min         |
| **Total**                 | **2-3 hours**  |

## References

- Existing parser: `packages/workflow-sdk/src/utils/parseSlashCommands.ts`
- Existing generator: `packages/workflow-sdk/src/utils/generateSlashCommandTypes.ts`
- Command definitions: `.claude/commands/*.md`
- Discussion: User requested `.agent/generated/` location for clarity

## Next Steps

1. Create `.agent/generated/` directory
2. Update `generateSlashCommandTypes.ts` to add `SlashCommandArgOrder` constant generation
3. Update `buildSlashCommand()` implementation to use the constant
4. Change CLI default output path
5. Regenerate types and verify output
6. Update re-exports
7. Add tests
8. Update documentation
