# Refactor Engine to Single-File Function Exports

**Status**: draft
**Created**: 2025-01-18
**Package**: apps/web
**Estimated Effort**: 3-4 hours

## Overview

Refactor `domain/workflow/services/engine` to follow the domain-driven architecture pattern where each file exports exactly one function matching the filename. This improves discoverability, maintainability, and consistency with the rest of the codebase.

## User Story

As a developer
I want engine services to follow the one-function-per-file pattern
So that I can easily locate, understand, and maintain workflow engine code

## Technical Approach

Split multi-export files into individual function files, rename single-export files to match their function names, move type definitions to `domain/workflow/types/`, and update all imports. Keep the `engine/steps/` subdirectory structure intact as a pragmatic exception for cohesive step factories.

## Key Design Decisions

1. **Strict one-function-per-file**: Split all multi-export files (`loader.ts`, `scanner.ts`, `steps/helpers.ts`) into individual files
2. **Filename matches function name**: Rename `registry.ts` → `initializeWorkflowEngine.ts`, `client.ts` → `createWorkflowClient.ts`, `runtime.ts` → `createWorkflowRuntime.ts`
3. **Keep steps/ subdirectory**: Maintain `engine/steps/` structure for cohesion (step factories are tightly related)
4. **Move types to domain/workflow/types/**: Separate interfaces (`WorkflowEngineConfig`, `ScanResult`) from logic

## Architecture

### Before

```
domain/workflow/services/engine/
├── client.ts              (exports createWorkflowClient + WorkflowEngineConfig)
├── loader.ts              (exports 3 functions)
├── scanner.ts             (exports 2 functions + ScanResult)
├── registry.ts            (exports initializeWorkflowEngine)
├── runtime.ts             (exports createWorkflowRuntime)
└── steps/
    ├── helpers.ts         (exports 4 functions)
    ├── index.ts           (barrel export)
    └── [other step files]
```

### After

```
domain/workflow/services/engine/
├── createWorkflowClient.ts              (exports createWorkflowClient)
├── createWorkflowRuntime.ts             (exports createWorkflowRuntime)
├── initializeWorkflowEngine.ts          (exports initializeWorkflowEngine)
├── loadProjectWorkflows.ts              (exports loadProjectWorkflows)
├── findWorkflowFiles.ts                 (exports findWorkflowFiles)
├── extractWorkflowDefinition.ts         (exports extractWorkflowDefinition)
├── scanProjectWorkflows.ts              (exports scanProjectWorkflows)
├── scanAllProjectWorkflows.ts           (exports scanAllProjectWorkflows)
├── index.ts                             (barrel export)
└── steps/
    ├── executeStep.ts                   (exports executeStep)
    ├── findOrCreateStep.ts              (exports findOrCreateStep)
    ├── updateStepStatus.ts              (exports updateStepStatus)
    ├── handleStepFailure.ts             (exports handleStepFailure)
    ├── index.ts                         (updated barrel export)
    └── [other step files]

domain/workflow/types/
├── engine.types.ts                      (existing RuntimeContext)
└── index.ts                             (add WorkflowEngineConfig, ScanResult)
```

### Integration Points

**Routes**:
- `routes/workflows.ts` (line 17) - imports `scanProjectWorkflows`
- Update: `import { scanProjectWorkflows } from "@/server/domain/workflow/services/engine/scanProjectWorkflows"`

**Server**:
- `server/index.ts` (line 29) - imports `initializeWorkflowEngine`
- Update: `import { initializeWorkflowEngine } from "@/server/domain/workflow/services/engine/initializeWorkflowEngine"`

**Engine Internal**:
- `registry.ts` imports from `client`, `runtime`, `loader`, `scanner`
- `runtime.ts` imports from `steps/index`
- `scanner.ts` imports from `loader`

## Implementation Details

### 1. Split loader.ts (3 exports → 3 files)

**Current exports**:
- `findWorkflowFiles(dir: string): Promise<string[]>`
- `extractWorkflowDefinition(module: Record<string, unknown>): WorkflowDefinition | null`
- `loadProjectWorkflows(projectPath: string, runtime: WorkflowRuntime, logger: FastifyBaseLogger): Promise<...>`

**New structure**:
- `findWorkflowFiles.ts` - Recursive file finder
- `extractWorkflowDefinition.ts` - Module parser with `isWorkflowDefinition` helper
- `loadProjectWorkflows.ts` - Main loader (imports previous two functions)

### 2. Split scanner.ts (2 exports + 1 interface → 2 files + 1 type)

**Current exports**:
- `ScanResult` interface
- `scanProjectWorkflows(projectId, projectPath, runtime, logger): Promise<number>`
- `scanAllProjectWorkflows(fastify): Promise<ScanResult>`

**New structure**:
- `scanProjectWorkflows.ts` - Single project scanner
- `scanAllProjectWorkflows.ts` - All projects scanner
- Move `ScanResult` to `domain/workflow/types/index.ts`

### 3. Split steps/helpers.ts (4 exports → 4 files)

**Current exports**:
- `findOrCreateStep(context, stepName): Promise<WorkflowRunStep>`
- `updateStepStatus(context, stepId, status, result?, error?): Promise<void>`
- `handleStepFailure(context, stepId, error): Promise<void>`
- `executeStep<T>(context, stepName, fn): Promise<T>`

**New structure**:
- `steps/findOrCreateStep.ts`
- `steps/updateStepStatus.ts`
- `steps/handleStepFailure.ts`
- `steps/executeStep.ts`

### 4. Rename single-export files

- `client.ts` → `createWorkflowClient.ts`
- `registry.ts` → `initializeWorkflowEngine.ts`
- `runtime.ts` → `createWorkflowRuntime.ts`

### 5. Move types to domain/workflow/types/

Extract from engine files:
- `WorkflowEngineConfig` (from `client.ts`)
- `ScanResult` (from `scanner.ts`)

Add to `domain/workflow/types/index.ts`:
```typescript
export interface WorkflowEngineConfig {
  appId: string;
  eventKey?: string;
  isDev: boolean;
  memoizationDbPath: string;
}

export interface ScanResult {
  scanned: number;
  discovered: number;
  errors: Array<{ projectId: string; error: string }>;
}
```

## Files to Create/Modify

### New Files (8)

1. `apps/web/src/server/domain/workflow/services/engine/findWorkflowFiles.ts` - File finder
2. `apps/web/src/server/domain/workflow/services/engine/extractWorkflowDefinition.ts` - Module parser
3. `apps/web/src/server/domain/workflow/services/engine/loadProjectWorkflows.ts` - Main loader
4. `apps/web/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts` - Single project scanner
5. `apps/web/src/server/domain/workflow/services/engine/scanAllProjectWorkflows.ts` - All projects scanner
6. `apps/web/src/server/domain/workflow/services/engine/steps/findOrCreateStep.ts` - Step finder
7. `apps/web/src/server/domain/workflow/services/engine/steps/updateStepStatus.ts` - Status updater
8. `apps/web/src/server/domain/workflow/services/engine/steps/handleStepFailure.ts` - Failure handler
9. `apps/web/src/server/domain/workflow/services/engine/steps/executeStep.ts` - Step executor

### Files to Rename (3)

1. `client.ts` → `createWorkflowClient.ts`
2. `registry.ts` → `initializeWorkflowEngine.ts`
3. `runtime.ts` → `createWorkflowRuntime.ts`

### Modified Files (4)

1. `apps/web/src/server/domain/workflow/types/index.ts` - Add `WorkflowEngineConfig`, `ScanResult`
2. `apps/web/src/server/domain/workflow/services/engine/index.ts` - Update barrel exports
3. `apps/web/src/server/domain/workflow/services/engine/steps/index.ts` - Update barrel exports
4. `apps/web/src/server/routes/workflows.ts` - Update import path (line 17)
5. `apps/web/src/server/index.ts` - Update import path (line 29)

### Files to Delete (3)

1. `apps/web/src/server/domain/workflow/services/engine/loader.ts`
2. `apps/web/src/server/domain/workflow/services/engine/scanner.ts`
3. `apps/web/src/server/domain/workflow/services/engine/steps/helpers.ts`

## Step by Step Tasks

### Task Group 1: Move Types

<!-- prettier-ignore -->
- [x] move-types-1 Update `domain/workflow/types/index.ts` to export `WorkflowEngineConfig` and `ScanResult`
  - Extract interfaces from `client.ts` and `scanner.ts`
  - File: `apps/web/src/server/domain/workflow/types/index.ts`

#### Completion Notes

- Added `WorkflowEngineConfig` and `ScanResult` interfaces to `domain/workflow/types/index.ts`
- Kept all JSDoc comments intact for documentation

### Task Group 2: Split loader.ts

<!-- prettier-ignore -->
- [x] split-loader-1 Create `findWorkflowFiles.ts` with `findWorkflowFiles` function
  - Extract lines 9-37 from `loader.ts`
  - File: `apps/web/src/server/domain/workflow/services/engine/findWorkflowFiles.ts`
- [x] split-loader-2 Create `extractWorkflowDefinition.ts` with `extractWorkflowDefinition` and `isWorkflowDefinition` functions
  - Extract lines 39-79 from `loader.ts`
  - Keep internal `isWorkflowDefinition` helper as non-exported function
  - File: `apps/web/src/server/domain/workflow/services/engine/extractWorkflowDefinition.ts`
- [x] split-loader-3 Create `loadProjectWorkflows.ts` with `loadProjectWorkflows` function
  - Extract lines 81-172 from `loader.ts`
  - Import `findWorkflowFiles` and `extractWorkflowDefinition`
  - File: `apps/web/src/server/domain/workflow/services/engine/loadProjectWorkflows.ts`
- [x] split-loader-4 Delete `loader.ts`
  - File: `apps/web/src/server/domain/workflow/services/engine/loader.ts`

#### Completion Notes

- Split loader.ts into 3 separate files: findWorkflowFiles, extractWorkflowDefinition, loadProjectWorkflows
- Kept isWorkflowDefinition as internal helper in extractWorkflowDefinition.ts (not exported)
- All imports and dependencies properly updated
- Deleted original loader.ts file

### Task Group 3: Split scanner.ts

<!-- prettier-ignore -->
- [x] split-scanner-1 Create `scanProjectWorkflows.ts` with `scanProjectWorkflows` function
  - Extract lines 19-75 from `scanner.ts`
  - Import `loadProjectWorkflows` from `./loadProjectWorkflows`
  - Import `ScanResult` type from `@/server/domain/workflow/types`
  - File: `apps/web/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts`
- [x] split-scanner-2 Create `scanAllProjectWorkflows.ts` with `scanAllProjectWorkflows` function
  - Extract lines 77-140 from `scanner.ts`
  - Import `scanProjectWorkflows` from `./scanProjectWorkflows`
  - Import `ScanResult` type from `@/server/domain/workflow/types`
  - File: `apps/web/src/server/domain/workflow/services/engine/scanAllProjectWorkflows.ts`
- [x] split-scanner-3 Delete `scanner.ts`
  - File: `apps/web/src/server/domain/workflow/services/engine/scanner.ts`

#### Completion Notes

- Split scanner.ts into 2 files: scanProjectWorkflows, scanAllProjectWorkflows
- Both files now import ScanResult type from @/server/domain/workflow/types
- All imports updated correctly
- Deleted original scanner.ts file

### Task Group 4: Rename Single-Export Files

<!-- prettier-ignore -->
- [x] rename-1 Rename `client.ts` to `createWorkflowClient.ts`
  - Update internal import of `WorkflowEngineConfig` to import from `@/server/domain/workflow/types`
  - File: `apps/web/src/server/domain/workflow/services/engine/createWorkflowClient.ts`
- [x] rename-2 Rename `registry.ts` to `initializeWorkflowEngine.ts`
  - Update imports: `createWorkflowClient`, `createWorkflowRuntime`, `loadProjectWorkflows`, `scanAllProjectWorkflows`
  - File: `apps/web/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts`
- [x] rename-3 Rename `runtime.ts` to `createWorkflowRuntime.ts`
  - No internal changes needed (already single export)
  - File: `apps/web/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts`

#### Completion Notes

- Renamed client.ts → createWorkflowClient.ts, updated to import WorkflowEngineConfig from types
- Renamed registry.ts → initializeWorkflowEngine.ts, updated all imports to new file names
- Renamed runtime.ts → createWorkflowRuntime.ts
- All files now follow the one-function-per-file naming pattern

### Task Group 5: Split steps/helpers.ts

<!-- prettier-ignore -->
- [x] split-helpers-1 Create `steps/findOrCreateStep.ts` with `findOrCreateStep` function
  - Extract lines 9-32 from `steps/helpers.ts`
  - Import domain services: `findOrCreateWorkflowStep` from `../../steps/findOrCreateWorkflowStep`
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/findOrCreateStep.ts`
- [x] split-helpers-2 Create `steps/updateStepStatus.ts` with `updateStepStatus` function
  - Extract lines 34-114 from `steps/helpers.ts`
  - Import domain services: `updateWorkflowStep` from `../../steps/updateWorkflowStep`
  - Import `createWorkflowEvent` from `@/server/domain/workflow/services`
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/updateStepStatus.ts`
- [x] split-helpers-3 Create `steps/handleStepFailure.ts` with `handleStepFailure` function
  - Extract lines 116-137 from `steps/helpers.ts`
  - Import `updateStepStatus` from `./updateStepStatus`
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/handleStepFailure.ts`
- [x] split-helpers-4 Create `steps/executeStep.ts` with `executeStep` function
  - Extract lines 139-176 from `steps/helpers.ts`
  - Import `findOrCreateStep`, `updateStepStatus`, `handleStepFailure` from respective files
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/executeStep.ts`
- [x] split-helpers-5 Delete `steps/helpers.ts`
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/helpers.ts`

#### Completion Notes

- Split steps/helpers.ts into 4 separate files
- Each function properly imports its dependencies
- All imports updated to point to new file locations
- Deleted original steps/helpers.ts file

### Task Group 6: Update Barrel Exports

<!-- prettier-ignore -->
- [x] barrel-1 Update `engine/index.ts` barrel export
  - Export all new function files
  - File: `apps/web/src/server/domain/workflow/services/engine/index.ts`
  - Content:
    ```typescript
    export { createWorkflowClient } from "./createWorkflowClient";
    export { createWorkflowRuntime } from "./createWorkflowRuntime";
    export { initializeWorkflowEngine } from "./initializeWorkflowEngine";
    export { findWorkflowFiles } from "./findWorkflowFiles";
    export { extractWorkflowDefinition } from "./extractWorkflowDefinition";
    export { loadProjectWorkflows } from "./loadProjectWorkflows";
    export { scanProjectWorkflows } from "./scanProjectWorkflows";
    export { scanAllProjectWorkflows } from "./scanAllProjectWorkflows";
    ```
- [x] barrel-2 Update `engine/steps/index.ts` barrel export
  - Update helper exports to point to new files
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/index.ts`
  - Content:
    ```typescript
    export { createPhaseStep } from "./phase";
    export { createAgentStep } from "./agent";
    export { createSlashStep } from "./slash";
    export { createGitStep } from "./git";
    export { createCliStep } from "./cli";
    export { createArtifactStep } from "./artifact";
    export { createAnnotationStep } from "./annotation";
    export { createRunStep } from "./run";
    export { executeStep } from "./executeStep";
    export { findOrCreateStep } from "./findOrCreateStep";
    export { updateStepStatus } from "./updateStepStatus";
    export { handleStepFailure } from "./handleStepFailure";
    ```

#### Completion Notes

- Created engine/index.ts barrel export with all engine functions
- Updated steps/index.ts to export from individual files instead of helpers.ts
- All exports now point to correct file locations

### Task Group 7: Update External Imports

<!-- prettier-ignore -->
- [x] imports-1 Update `routes/workflows.ts` import
  - Line 17: Change from `@/server/domain/workflow/services/engine/scanner` to `@/server/domain/workflow/services/engine/scanProjectWorkflows`
  - Or use barrel: `@/server/domain/workflow/services/engine`
  - File: `apps/web/src/server/routes/workflows.ts`
- [x] imports-2 Update `server/index.ts` import
  - Line 29: Change from `@/server/domain/workflow/services/engine/registry` to `@/server/domain/workflow/services/engine/initializeWorkflowEngine`
  - Or use barrel: `@/server/domain/workflow/services/engine`
  - File: `apps/web/src/server/index.ts`

#### Completion Notes

- Updated routes/workflows.ts to import scanProjectWorkflows from barrel export
- Updated server/index.ts to import initializeWorkflowEngine from barrel export
- Both imports now use barrel exports for cleaner imports

## Testing Strategy

### Unit Tests

No new tests required - this is a refactor that preserves existing behavior. Existing tests should pass without modification.

### Integration Tests

**Manual verification**:
1. Server starts without errors
2. Workflow engine initializes successfully
3. Workflow scanning works
4. Workflow run works

## Success Criteria

- [ ] All multi-export files split into single-function files
- [ ] Single-export files renamed to match function names
- [ ] Types moved to `domain/workflow/types/`
- [ ] Barrel exports updated
- [ ] External imports updated
- [ ] No TypeScript compilation errors
- [ ] Server starts successfully
- [ ] Workflow engine initializes without errors
- [ ] No linter errors

## Validation

Execute these commands to verify the refactor works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Check server logs for: "Workflow engine initialized"
3. Verify no import errors in console
4. Test workflow scanning via API: `POST /api/projects/:projectId/workflows/refresh`
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- Import patterns work from barrel exports (`@/server/domain/workflow/services/engine`)
- Import patterns work from direct file paths
- `WorkflowEngineConfig` type available from `@/server/domain/workflow/types`
- `ScanResult` type available from `@/server/domain/workflow/types`

## Implementation Notes

### 1. Keep Internal Helpers Private

The `isWorkflowDefinition` function in `extractWorkflowDefinition.ts` should NOT be exported - it's an internal helper only used within that file.

### 2. Import Order

When creating new files, follow this import order:
1. Node.js built-ins (`node:fs/promises`, etc.)
2. External packages (`@repo/workflow-sdk`, `inngest`)
3. Type-only imports (`import type { ... }`)
4. Internal imports (`@/server/...`, `@/shared/...`)
5. Relative imports (`./`, `../`)

### 3. Barrel Export Strategy

The barrel export (`engine/index.ts`) should re-export all public functions. Consumers can choose to:
- Import from barrel: `import { scanProjectWorkflows } from "@/server/domain/workflow/services/engine"`
- Import directly: `import { scanProjectWorkflows } from "@/server/domain/workflow/services/engine/scanProjectWorkflows"`

Both patterns are valid.

## Dependencies

- No new dependencies required
- Existing dependencies: `@repo/workflow-sdk`, `inngest`, `@prisma/client`

## Timeline

| Task                          | Estimated Time |
| ----------------------------- | -------------- |
| Move types                    | 15 min         |
| Split loader.ts               | 30 min         |
| Split scanner.ts              | 20 min         |
| Rename single-export files    | 15 min         |
| Split steps/helpers.ts        | 30 min         |
| Update barrel exports         | 15 min         |
| Update external imports       | 10 min         |
| Verification and testing      | 30 min         |
| **Total**                     | **3-4 hours**  |

## References

- CLAUDE.md: Domain-driven architecture principles
- `domain/project/services/` - Example of single-file pattern
- `domain/session/services/` - Another example of single-file pattern

## Next Steps

1. Move type definitions to `domain/workflow/types/`
2. Split multi-export files (loader, scanner, helpers)
3. Rename single-export files to match function names
4. Update barrel exports
5. Update external imports
6. Run type checking and build verification
7. Manual testing of workflow engine initialization
