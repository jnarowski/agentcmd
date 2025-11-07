# Rename Project: agent-workflows → agentcmd

**Status**: draft
**Created**: 2025-01-26
**Package**: monorepo
**Total Complexity**: 47 points
**Phases**: 4
**Tasks**: 16
**Overall Avg Complexity**: 2.9/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Package Renames | 5 | 15 | 3.0/10 | 4/10 |
| Phase 2: Repository Metadata | 2 | 6 | 3.0/10 | 3/10 |
| Phase 3: Documentation Updates | 6 | 18 | 3.0/10 | 4/10 |
| Phase 4: Workspace Dependencies | 3 | 8 | 2.7/10 | 3/10 |
| **Total** | **16** | **47** | **2.9/10** | **4/10** |

## Overview

Rename the project from "agent-workflows" to "agentcmd" across all packages, documentation, and metadata. This includes updating package names (agentcmd-workflows, agent-cli-sdk, agentcmd), repository URLs (https://github.com/jnarowski/agentcmd), and all references in documentation files.

## User Story

As a project maintainer
I want to rename the project to "agentcmd"
So that the branding is consistent and the package names reflect the new project identity

## Technical Approach

Systematic rename across three main areas:
1. **Package names**: Update npm package names in package.json files
2. **Repository metadata**: Update GitHub URLs, homepage, and bugs URLs
3. **Documentation**: Update all references in README, CLAUDE.md, and other docs
4. **Workspace dependencies**: Update internal package references

Key decisions:
- Use unscoped npm names (no `@org/` prefix)
- Keep monorepo structure intact
- Update CLI_NAME constant (already done)
- Maintain directory structure (no folder renames needed)

## Key Design Decisions

1. **Unscoped Package Names**: Using `agentcmd-workflows`, `agent-cli-sdk`, `agentcmd` instead of `@sourceborn/` to avoid npm org requirement
2. **Singular Monorepo Name**: Root package named `agentcmd` (not `agentcmd-monorepo`) for simplicity
3. **agent-cli-sdk Unchanged**: This package remains `agent-cli-sdk` (not `agentcmd-agent-cli-sdk`) since it's general-purpose for AI CLI tools
4. **Repository Structure**: No directory renames needed - only package.json and documentation updates

## Architecture

### Package Structure
```
agentcmd/
├── packages/
│   ├── workflow-sdk/          # → agentcmd-workflows
│   ├── agent-cli-sdk/         # → agent-cli-sdk
│   ├── ui/                    # @repo/ui (private)
│   ├── eslint-config/         # @repo/eslint-config (private)
│   └── typescript-config/     # @repo/typescript-config (private)
├── apps/
│   └── web/                   # bin: agentcmd
└── package.json               # agentcmd
```

### Integration Points

**Packages**:
- `packages/workflow-sdk/package.json` - Name, bin, repo URLs, description
- `packages/agent-cli-sdk/package.json` - Name, repo URLs
- `apps/web/package.json` - Binary name, workspace dependency

**Root**:
- `package.json` - Name, description, repo URLs

**Documentation**:
- `README.md` - Title, all references
- `CLAUDE.md` - Project name, CLI paths, examples
- `apps/web/CLAUDE.md`, `README.md`, `CLI.md` - All references
- `packages/*/README.md` - Package names in examples

## Implementation Details

### 1. Package Name Changes

**workflow-sdk** becomes **agentcmd-workflows**:
- Update `name` field
- Update `bin` field (`workflow-sdk` → `agentcmd-workflows`)
- Update description (Sourceborn → agentcmd)
- Update all repo metadata

**agent-cli-sdk** becomes **agent-cli-sdk** (scoped → unscoped):
- Remove `@repo/` prefix
- Update repo metadata

**web app** binary becomes **agentcmd**:
- Update `bin` field (`agent-workflows-ui` → `agentcmd`)

### 2. Repository URLs

All packages point to: `https://github.com/jnarowski/agentcmd`

With `directory` field for monorepo packages:
- workflow-sdk: `packages/workflow-sdk`
- agent-cli-sdk: `packages/agent-cli-sdk`

### 3. Documentation Updates

All files mentioning "agent-workflows" need updates:
- Project name
- CLI tool name
- Directory paths (`~/.agent-workflows/` → `~/.agentcmd/`)
- Package import examples
- Installation commands

## Files to Create/Modify

### New Files (0)

None - this is a rename operation only

### Modified Files (13)

1. `packages/workflow-sdk/package.json` - Name, bin, description, repo URLs
2. `packages/workflow-sdk/README.md` - Package name in examples
3. `packages/workflow-sdk/src/index.ts` - JSDoc comment
4. `packages/agent-cli-sdk/package.json` - Name, repo URLs
5. `apps/web/package.json` - Binary name, workspace dependency
6. `package.json` - Root package name, description, repo URLs
7. `README.md` - Title, all references
8. `CLAUDE.md` - Project overview, CLI paths, examples
9. `apps/web/CLAUDE.md` - All references to agent-workflows
10. `apps/web/README.md` - CLI tool name, examples
11. `apps/web/CLI.md` - All references
12. `packages/workflow-sdk/README.md` - Import examples
13. `packages/agent-cli-sdk/README.md` - Package name

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Package Renames

**Phase Complexity**: 15 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 1.1 [3/10] Update workflow-sdk package.json name and metadata
  - Change `name` from `@repo/workflow-sdk` to `agentcmd-workflows`
  - Change `description` from "Sourceborn workflow engine" to "agentcmd workflow engine"
  - Change `bin.workflow-sdk` to `bin.agentcmd-workflows`
  - Update `repository.url` to `https://github.com/jnarowski/agentcmd`
  - Add `repository.directory: "packages/workflow-sdk"`
  - Update `homepage` to `https://github.com/jnarowski/agentcmd/tree/main/packages/workflow-sdk#readme`
  - Update `bugs.url` to `https://github.com/jnarowski/agentcmd/issues`
  - File: `packages/workflow-sdk/package.json`

- [x] 1.2 [2/10] Update workflow-sdk source code JSDoc
  - Change JSDoc comment `@repo/workflow-sdk - Type-safe workflow SDK for Sourceborn` to `agentcmd-workflows - Type-safe workflow SDK for agentcmd`
  - Update example import from `'@repo/workflow-sdk'` to `'agentcmd-workflows'`
  - File: `packages/workflow-sdk/src/index.ts`

- [x] 1.3 [4/10] Update agent-cli-sdk package.json name and metadata
  - Change `name` from `@repo/agent-cli-sdk` to `agent-cli-sdk`
  - Update `repository.url` to `https://github.com/jnarowski/agentcmd`
  - Add `repository.directory: "packages/agent-cli-sdk"`
  - Update `homepage` to `https://github.com/jnarowski/agentcmd/tree/main/packages/agent-cli-sdk#readme`
  - Update `bugs.url` to `https://github.com/jnarowski/agentcmd/issues`
  - File: `packages/agent-cli-sdk/package.json`

- [x] 1.4 [3/10] Update web app package.json binary name
  - Change `bin.agent-workflows-ui` to `bin.agentcmd`
  - File: `apps/web/package.json`

- [x] 1.5 [3/10] Verify CLI_NAME constant is set to "agentcmd"
  - Confirm `CLI_NAME = "agentcmd"` in constants file
  - This constant controls `~/.agentcmd/` directory path
  - File: `apps/web/src/cli/utils/constants.ts`
  - Command: `grep 'CLI_NAME = "agentcmd"' apps/web/src/cli/utils/constants.ts`

#### Completion Notes

- All package names updated to unscoped format (agentcmd-workflows, agent-cli-sdk)
- workflow-sdk binary renamed from `workflow-sdk` to `agentcmd-workflows`
- web app binary renamed from `agent-workflows-ui` to `agentcmd`
- Repository URLs updated to https://github.com/jnarowski/agentcmd
- CLI_NAME constant confirmed as "agentcmd" (controls ~/.agentcmd/ directory)

### Phase 2: Repository Metadata

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 2.1 [3/10] Update root package.json metadata
  - Change `name` from `agent-workflows-monorepo-v2` to `agentcmd`
  - Update `description` to reference agentcmd (not agent-workflows)
  - Update `repository.url` to `https://github.com/jnarowski/agentcmd`
  - Update `homepage` to `https://github.com/jnarowski/agentcmd#readme`
  - Update `bugs.url` to `https://github.com/jnarowski/agentcmd/issues`
  - File: `package.json`

- [x] 2.2 [3/10] Verify all package.json files have correct repository structure
  - All packages should have `repository.url`, `repository.directory`, `homepage`, `bugs`
  - Private packages (@repo/*) don't need repository fields
  - Command: `grep -A5 '"repository"' packages/*/package.json apps/*/package.json package.json`

#### Completion Notes

- Root package.json renamed from "agent-workflows-monorepo-v2" to "agentcmd"
- All repository URLs point to https://github.com/jnarowski/agentcmd
- Published packages have `repository.directory` field for monorepo structure
- Private packages (@repo/ui, @repo/eslint-config, @repo/typescript-config) don't have repository fields (correct)

### Phase 3: Documentation Updates

**Phase Complexity**: 18 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 3.1 [4/10] Update root README.md
  - Change title from "Agent Workflows Monorepo" to "agentcmd"
  - Update all references to "agent-workflows" → "agentcmd"
  - Update package names in What's Inside section
  - File: `README.md`

- [x] 3.2 [4/10] Update root CLAUDE.md
  - Update project overview section
  - Change CLI tool references from "agent-workflows" to "agentcmd"
  - Update directory path examples: `~/.agent-workflows/` → `~/.agentcmd/`
  - Update package names in architecture section
  - File: `CLAUDE.md`

- [x] 3.3 [3/10] Update apps/web/CLAUDE.md
  - Change all references to agent-workflows → agentcmd
  - Update CLI tool name throughout
  - Update directory paths
  - File: `apps/web/CLAUDE.md`

- [x] 3.4 [2/10] Update apps/web/README.md
  - Update CLI tool name
  - Update installation examples
  - File: `apps/web/README.md`

- [x] 3.5 [2/10] Update apps/web/CLI.md
  - Update all references to agent-workflows
  - Update binary name examples
  - File: `apps/web/CLI.md`

- [x] 3.6 [3/10] Update package README files
  - Update `packages/workflow-sdk/README.md` - import examples from `@repo/workflow-sdk` to `agentcmd-workflows`
  - Update `packages/agent-cli-sdk/README.md` - package name references
  - Files: `packages/workflow-sdk/README.md`, `packages/agent-cli-sdk/README.md`

#### Completion Notes

- Root README title changed to "agentcmd"
- Package names updated in What's Inside section
- Root CLAUDE.md: all CLI references changed from "agent-workflows-ui" to "agentcmd"
- Directory paths changed from ~/.agent-workflows/ to ~/.agentcmd/
- Web app docs updated via sed (CLAUDE.md, README.md, CLI.md)
- Package READMEs updated: @repo/workflow-sdk → agentcmd-workflows, @repo/agent-cli-sdk → agent-cli-sdk

### Phase 4: Workspace Dependencies

**Phase Complexity**: 8 points (avg 2.7/10)

<!-- prettier-ignore -->
- [x] 4.1 [3/10] Update workspace dependency in apps/web/package.json
  - Change `"@repo/workflow-sdk": "workspace:*"` to `"agentcmd-workflows": "workspace:*"`
  - Keep `"@repo/agent-cli-sdk": "workspace:*"` as-is (private monorepo reference)
  - File: `apps/web/package.json`

- [x] 4.2 [2/10] Update any imports in web app source code
  - Search for `from '@repo/workflow-sdk'` and replace with `from 'agentcmd-workflows'`
  - Command: `grep -r "@repo/workflow-sdk" apps/web/src --include="*.ts" --include="*.tsx"`
  - Note: May need to update imports in workflow engine files

- [x] 4.3 [3/10] Reinstall dependencies and verify workspace resolution
  - Run `pnpm install` to update lockfile with new package names
  - Verify workspace dependencies resolve correctly
  - Command: `pnpm install && pnpm build`

#### Completion Notes

- Workspace dependency changed from "@repo/workflow-sdk" to "agentcmd-workflows"
- Also updated "@repo/agent-cli-sdk" to "agent-cli-sdk" (unscoped)
- All TypeScript imports updated via sed (both packages)
- CLI command references updated in WorkflowSdkInstallDialog (workflow-sdk → agentcmd-workflows)
- Fixed config.ts export issue (added named export)
- Dependencies reinstalled successfully
- Full build passes: all 3 packages build successfully

## Testing Strategy

### Build Verification

After all changes, verify the monorepo builds successfully:

```bash
pnpm build
```

All packages should compile without errors.

### Import Verification

Check that workspace dependencies resolve:

```bash
# In apps/web
pnpm list agentcmd-workflows
pnpm list @repo/agent-cli-sdk
```

### CLI Tool Verification

Test that the binary name works:

```bash
# After building
node apps/web/dist/cli.js --help
# Should show "agentcmd" as the command name
```

## Success Criteria

- [ ] All package.json files updated with new names
- [ ] Repository URLs point to `https://github.com/jnarowski/agentcmd`
- [ ] All documentation uses "agentcmd" consistently
- [ ] Directory paths reference `~/.agentcmd/`
- [ ] Workspace dependencies resolve correctly
- [ ] Monorepo builds successfully (`pnpm build`)
- [ ] No remaining references to "agent-workflows" in active code
- [ ] Binary name is `agentcmd`
- [ ] Package names are `agentcmd-workflows` and `agent-cli-sdk`

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: All packages build successfully

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Verify package names
grep '"name":' package.json packages/*/package.json apps/*/package.json
# Expected:
# package.json:  "name": "agentcmd",
# packages/workflow-sdk/package.json:  "name": "agentcmd-workflows",
# packages/agent-cli-sdk/package.json:  "name": "agent-cli-sdk",

# Verify repository URLs
grep -A2 '"repository":' package.json packages/workflow-sdk/package.json packages/agent-cli-sdk/package.json
# Expected: All point to https://github.com/jnarowski/agentcmd

# Verify workspace dependencies
grep "agentcmd-workflows" apps/web/package.json
# Expected: "agentcmd-workflows": "workspace:*"
```

**Manual Verification:**

1. Check lockfile: `grep "agentcmd-workflows" pnpm-lock.yaml`
2. Search for old references: `grep -r "agent-workflows" README.md CLAUDE.md apps/web/*.md`
3. Verify CLI constant: `grep CLI_NAME apps/web/src/cli/utils/constants.ts`
4. Check import statements: `grep -r "@repo/workflow-sdk" apps/web/src`

**Feature-Specific Checks:**

- CLI help shows correct name: `node apps/web/dist/cli.js --help` should mention "agentcmd"
- Package registry metadata is correct for publishing
- No broken cross-references in documentation

## Implementation Notes

### 1. Scope vs Unscoped Package Names

Decision made to use unscoped names (`agentcmd-workflows`, not `@sourceborn/agentcmd-workflows`) to avoid requiring an npm organization. This simplifies publishing and installation.

### 2. Private Packages Unchanged

The `@repo/*` packages (`ui`, `eslint-config`, `typescript-config`) remain private and unchanged - they're not published to npm.

### 3. agent-cli-sdk Naming

Keeping `agent-cli-sdk` (not `agentcmd-agent-cli-sdk`) because this package is general-purpose for AI CLI tools and not specific to the agentcmd platform.

### 4. No Directory Renames

The actual directory structure (`packages/workflow-sdk/`, `packages/agent-cli-sdk/`) stays the same - only package.json names change. This minimizes git history disruption.

### 5. CLI_NAME Already Updated

The `CLI_NAME` constant in `apps/web/src/cli/utils/constants.ts` is already set to `"agentcmd"`, which controls the `~/.agentcmd/` directory path.

## Dependencies

No new dependencies required - this is purely a rename operation.

## References

- Previous discussion about renaming to agentcmd
- NPM monorepo package publishing patterns: https://docs.npmjs.com/cli/v7/using-npm/workspaces
- Example monorepos: Babel, Jest, Turborepo (all use `repository.directory` for packages)

## Next Steps

1. Execute Phase 1: Update all package.json files
2. Execute Phase 2: Update repository metadata
3. Execute Phase 3: Update all documentation
4. Execute Phase 4: Update workspace dependencies and rebuild
5. Verify build and imports work correctly
6. Commit changes with message: "Rename project from agent-workflows to agentcmd"

## Review Findings

**Review Date:** 2025-01-07
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feat/project-cleanup-v2
**Commits Reviewed:** 1

### Summary

Implementation is largely complete with all package renames and core documentation updates in place. However, **HIGH priority** issues found in README.md Quick Start section containing old references that would confuse new users trying to install the tool. All validation commands pass (build, type-check successful).

### Phase 3: Documentation Updates

**Status:** ⚠️ Incomplete - Root README.md Quick Start section missed

#### HIGH Priority

- [x] **README.md Quick Start section contains old references**
  - **File:** `README.md:72-102`
  - **Spec Reference:** "Phase 3.1 - Update all references to 'agent-workflows' → 'agentcmd'"
  - **Expected:** All installation commands, directory paths, and repository URLs updated to "agentcmd"
  - **Actual:** Multiple old references remain:
    - Line 72: `git clone https://github.com/sourceborn/agent-workflows-monorepo.git`
    - Line 73: `cd agent-workflows-monorepo`
    - Line 76: `npx agent-workflows-ui install`
    - Line 77: `# Creates ~/.agent-workflows/ with:`
    - Line 82: `npx agent-workflows-ui start`
  - **Fix:** Update all Quick Start commands to use:
    - Repository: `https://github.com/jnarowski/agentcmd`
    - Directory: `cd agentcmd`
    - Binary: `npx agentcmd install` and `npx agentcmd start`
    - Home directory: `~/.agentcmd/`

#### Review 1 Completion Notes

- Fixed all 10 old references in README.md:
  - Git clone URL: sourceborn/agent-workflows-monorepo → jnarowski/agentcmd
  - Directory name: agent-workflows-monorepo → agentcmd
  - Binary name: agent-workflows-ui → agentcmd (5 occurrences)
  - Home directory: ~/.agent-workflows/ → ~/.agentcmd/ (3 occurrences)
  - Package name: @repo/agent-workflows → agentcmd-workflows
  - Directory path: packages/agent-workflows/ → packages/workflow-sdk/
  - Code example imports updated
- Verified no remaining "agent-workflows" references with grep

### Positive Findings

- ✅ All package.json files correctly renamed (agentcmd, agentcmd-workflows, agent-cli-sdk)
- ✅ Repository URLs all point to https://github.com/jnarowski/agentcmd
- ✅ Root CLAUDE.md fully updated with agentcmd references
- ✅ Web app documentation (CLAUDE.md, CLI.md) correctly updated
- ✅ Package READMEs updated with correct import examples
- ✅ Workspace dependencies correctly resolve (agentcmd-workflows: workspace:*)
- ✅ CLI_NAME constant set to "agentcmd" in apps/web/src/cli/utils/constants.ts
- ✅ Build passes successfully (pnpm build completed in 341ms)
- ✅ No old @repo/workflow-sdk import references found in source code
- ✅ JSDoc in packages/workflow-sdk/src/index.ts correctly updated

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [ ] All findings addressed and tested
