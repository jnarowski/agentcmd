# Consolidate Workflow Schemas to Shared Folder

**Status**: draft
**Created**: 2025-01-03
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Move workflow validation schemas (Zod) and derived enum types to `shared/schemas/` while keeping complex model interfaces domain-specific. Enables schema reuse for validation, derives TypeScript types from schemas to prevent drift, and fixes critical type mismatches.

## User Story

As a developer
I want validation schemas and enum types in a shared location
So that frontend and backend use identical validation logic without coupling implementation details

## Technical Approach

1. Create new `apps/web/src/shared/schemas/` directory
2. Move Zod validation schemas from backend domain to shared
3. Export derived enum types from schemas (WorkflowStatus, StepStatus, etc.)
4. Update backend routes to import schemas from shared
5. Update frontend to import only enum types from shared (not full interfaces)
6. Fix critical type mismatches (step field names, artifact schema)
7. Keep complex types domain-specific (WorkflowRun stays in frontend/backend separately)

## Key Design Decisions

1. **Schemas in shared, complex types stay separate**: Zod schemas are shared for validation. Complex model interfaces (WorkflowRun, etc.) stay domain-specific to avoid coupling.
2. **Hybrid approach**: Share enums and validation, keep models separate. Frontend defines interfaces with UI needs, backend uses Prisma types directly.
3. **Frontend can optionally validate**: Sharing schemas enables client-side form validation using same rules as backend.
4. **No coupling between layers**: Backend uses Prisma-generated types (111 usages). Frontend uses custom interfaces (12 definitions). Only enums are shared.

## Architecture

### File Structure
```
apps/web/src/
├── shared/
│   ├── schemas/
│   │   ├── workflow.schemas.ts          # NEW: All workflow Zod schemas + derived types
│   │   └── index.ts                     # NEW: Re-export all schemas
│   └── types/
│       └── index.ts                     # MODIFIED: Re-export workflow types
│
├── server/
│   ├── domain/workflow/
│   │   ├── schemas/                     # DELETED: Move all to shared
│   │   │   ├── workflow.schemas.ts      # DELETE
│   │   │   ├── artifact.schemas.ts      # DELETE
│   │   │   └── comment.schemas.ts       # DELETE
│   │   └── types/                       # KEEP: Backend service types only
│   │       ├── workflow.types.ts        # MODIFIED: Remove duplicates, import from shared
│   │       ├── artifact.types.ts        # MODIFIED: Import types from shared
│   │       ├── comment.types.ts         # MODIFIED: Import types from shared
│   │       └── event.types.ts           # MODIFIED: Import types from shared
│   └── routes/
│       ├── workflows.ts                 # MODIFIED: Import from shared
│       ├── workflow-artifacts.ts        # MODIFIED: Import from shared
│       └── workflow-comments.ts         # MODIFIED: Import from shared
│
└── client/pages/projects/workflows/
    └── types.ts                         # MODIFIED: Import enums from shared, fix field names
```

### Integration Points

**Backend Routes (3 files)**:
- `workflows.ts` - Import validation schemas from `@/shared/schemas`
- `workflow-artifacts.ts` - Import validation schemas from `@/shared/schemas`
- `workflow-comments.ts` - Import validation schemas from `@/shared/schemas`
- **Note**: Continue using Prisma types for database operations

**Frontend Types (1 file)**:
- `types.ts` - Import only enum types (`WorkflowStatus`, `StepStatus`) from shared
- Keep `WorkflowRun` interface (frontend extends with UI needs)
- Keep `WorkflowRunStep` interface (but fix field names)
- Fix `step_name`/`phase_name` → `name`/`phase` to match Prisma
- Remove duplicate enum definitions

**Backend Domain Types (MINIMAL CHANGES)**:
- Backend uses Prisma-generated types directly (no manual interfaces needed)
- No changes required - backend doesn't define WorkflowRun interface
- Domain service types (CreateWorkflowRunInput) can stay in domain

## Implementation Details

### 1. Shared Schema Structure (Validation Only)

Create shared schema file with validation logic and derived enum types.

**Key Points**:
- Export Zod schemas for validation (request/response)
- Export derived enum types only (WorkflowStatus, StepStatus, etc.)
- Do NOT export complex model interfaces (those stay domain-specific)
- Group schemas logically (enums, requests, responses)
- Add JSDoc comments for all exports

**What to share:**
```typescript
// ✅ SHARE - Validation schemas
export const createWorkflowRunSchema = z.object({...});
export const workflowExecutionResponseSchema = z.object({...});

// ✅ SHARE - Enum types (derived from schemas)
export const workflowStatusSchema = z.enum(['pending', 'running', ...]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

// ❌ DON'T SHARE - Complex model interfaces
// WorkflowRun interface stays in frontend types.ts
// Backend uses Prisma-generated types directly
```

### 2. Type Derivation Pattern (Enums Only)

Derive enum types from Zod schemas, keep model interfaces separate.

**Key Points**:
- Enum schemas → derived types (shared)
- Model interfaces → defined separately per domain
- Backend uses Prisma types (not manual interfaces)
- Frontend defines interfaces with UI extensions

**Example**:
```typescript
// Shared enum (apps/web/src/shared/schemas/workflow.schemas.ts)
export const workflowStatusSchema = z.enum(['pending', 'running', ...]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

// Frontend model (apps/web/src/client/pages/projects/workflows/types.ts)
import type { WorkflowStatus } from '@/shared/schemas';

export interface WorkflowRun {
  id: string;
  status: WorkflowStatus; // ← Uses shared enum
  // ... other fields frontend needs
}
```

### 3. Critical Type Fixes

Fix type mismatches discovered in audit.

**Key Points**:
- Frontend `WorkflowRunStep`: Change `step_name` → `name`, `phase_name` → `phase`
- Artifact schema: Change `workflow_comment_id` → `workflow_event_id`
- Response schemas: Add optional relation fields (`steps?`, `events?`, `workflow_definition?`)

### 4. Minimal Import Changes

Only validation-related imports change.

**Key Points**:
- Backend routes: Import schemas from `@/shared/schemas` (3 files)
- Frontend types: Import only enums from `@/shared/schemas` (1 file)
- Backend domain: NO CHANGES (uses Prisma types)
- Frontend interfaces: Stay in `types.ts` (not shared)

## Files to Create/Modify

### New Files (2)

1. `apps/web/src/shared/schemas/workflow.schemas.ts` - All workflow Zod schemas + derived types
2. `apps/web/src/shared/schemas/index.ts` - Re-export all schemas

### Modified Files (6)

1. `apps/web/src/shared/types/index.ts` - Re-export workflow schemas
2. `apps/web/src/server/routes/workflows.ts` - Import validation schemas from shared
3. `apps/web/src/server/routes/workflow-artifacts.ts` - Import validation schemas from shared
4. `apps/web/src/server/routes/workflow-comments.ts` - Import validation schemas from shared
5. `apps/web/src/client/pages/projects/workflows/types.ts` - Import enum types only, fix field names
6. `apps/web/CLAUDE.md` - Document shared schema pattern and hybrid approach

### Deleted Files (3)

1. `apps/web/src/server/domain/workflow/schemas/workflow.schemas.ts` - Moved to shared
2. `apps/web/src/server/domain/workflow/schemas/artifact.schemas.ts` - Moved to shared
3. `apps/web/src/server/domain/workflow/schemas/comment.schemas.ts` - Moved to shared

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Create Shared Schema Infrastructure

<!-- prettier-ignore -->
- [x] schema-1 Create shared schemas directory
  - Create `apps/web/src/shared/schemas/` directory
  - Command: `mkdir -p apps/web/src/shared/schemas`
- [x] schema-2 Create workflow.schemas.ts with all schemas
  - Consolidate all schemas from backend domain
  - File: `apps/web/src/shared/schemas/workflow.schemas.ts`
  - Include: workflowStatusSchema, stepStatusSchema, artifactTypeSchema, commentTypeSchema
  - Include: createWorkflowRunSchema, workflowExecutionFiltersSchema
  - Include: workflowExecutionResponseSchema, artifactResponseSchema, commentResponseSchema
  - Export derived types for all schemas using `z.infer<>`
- [x] schema-3 Fix artifact schema field name
  - Change `workflow_comment_id` to `workflow_event_id` in artifactResponseSchema
  - File: `apps/web/src/shared/schemas/workflow.schemas.ts`
  - Matches Prisma schema WorkflowArtifact model
- [x] schema-4 Add optional relation fields to response schemas
  - Add `steps: z.array(...)optional()` to workflowExecutionResponseSchema
  - Add `events: z.array(...).optional()` to workflowExecutionResponseSchema
  - Add `workflow_definition: z.object(...).optional()` to workflowExecutionResponseSchema
  - File: `apps/web/src/shared/schemas/workflow.schemas.ts`
- [x] schema-5 Create schemas index file
  - Re-export all schemas and types
  - File: `apps/web/src/shared/schemas/index.ts`
  - Pattern: `export * from './workflow.schemas'`

#### Completion Notes

- Created `apps/web/src/shared/schemas/` directory
- Consolidated all workflow validation schemas into `workflow.schemas.ts`
- Exported enum types: WorkflowStatus, StepStatus, ArtifactType, WorkflowEventType
- Fixed artifact schema field: `workflow_event_id` (was `workflow_comment_id`)
- Added optional relation fields to workflowExecutionResponseSchema: `steps`, `events`, `workflow_definition`
- Created barrel export in `index.ts` for easy imports

### Phase 2: Update Backend Route Imports

<!-- prettier-ignore -->
- [x] backend-1 Update workflows.ts route imports
  - Change import from `@/server/domain/workflow/schemas` to `@/shared/schemas`
  - File: `apps/web/src/server/routes/workflows.ts`
  - Update: createWorkflowRunSchema, workflowExecutionFiltersSchema, workflowExecutionResponseSchema
- [x] backend-2 Update workflow-artifacts.ts route imports
  - Change import from `@/server/domain/workflow/schemas` to `@/shared/schemas`
  - File: `apps/web/src/server/routes/workflow-artifacts.ts`
  - Update: uploadArtifactSchema, attachArtifactSchema, artifactResponseSchema
- [x] backend-3 Update workflow-comments.ts route imports
  - Change import from `@/server/domain/workflow/schemas` to `@/shared/schemas`
  - File: `apps/web/src/server/routes/workflow-comments.ts`
  - Update: createCommentSchema, getCommentsQuerySchema, commentResponseSchema

#### Completion Notes

- Updated all 3 route files to import from `@/shared/schemas` instead of `@/server/domain/workflow/schemas`
- Renamed comment schemas to workflow event schemas (createWorkflowEventSchema, getWorkflowEventsQuerySchema)
- Added artifactTypeSchema import to workflow-artifacts.ts
- Backend routes now use shared validation schemas

### Phase 3: Update Frontend Types (Enum Imports Only)

<!-- prettier-ignore -->
- [x] frontend-1 Import only enum types from shared schemas
  - Add imports: `WorkflowStatus`, `StepStatus` from `@/shared/schemas`
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
  - Do NOT import WorkflowRun or other model interfaces
- [x] frontend-2 Remove duplicate WorkflowStatus definition
  - Delete `export const WorkflowStatus = { PENDING: 'pending', ... } as const`
  - Delete `export type WorkflowStatus = typeof WorkflowStatus[keyof typeof WorkflowStatus]`
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
- [x] frontend-3 Remove duplicate StepStatus definition
  - Delete `export const StepStatus = { PENDING: 'pending', ... } as const`
  - Delete `export type StepStatus = typeof StepStatus[keyof typeof StepStatus]`
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
- [x] frontend-4 Fix WorkflowRunStep field names
  - Change `step_name: string` to `name: string`
  - Change `phase_name: string` to `phase: string`
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
  - Matches Prisma schema WorkflowRunStep model
- [x] frontend-5 Keep WorkflowRun interface in frontend types
  - Do NOT move to shared
  - Frontend interface has UI-specific needs (optional relations, computed fields)
  - Use imported WorkflowStatus and StepStatus enums
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
- [x] frontend-6 Update shared types index
  - Re-export workflow schemas
  - File: `apps/web/src/shared/types/index.ts`
  - Add: `export * from '../schemas'`

#### Completion Notes

- Replaced duplicate enum definitions with imports from `@/shared/schemas`
- Fixed WorkflowRunStep field names: `name` and `phase` (were `step_name` and `phase_name`)
- Kept WorkflowRun interface in frontend (not shared, as intended)
- Updated shared types index to re-export schemas
- Frontend now uses shared enum types while maintaining custom interfaces

### Phase 4: Cleanup & Documentation

<!-- prettier-ignore -->
- [x] cleanup-1 Delete old schema files
  - Delete `apps/web/src/server/domain/workflow/schemas/workflow.schemas.ts`
  - Delete `apps/web/src/server/domain/workflow/schemas/artifact.schemas.ts`
  - Delete `apps/web/src/server/domain/workflow/schemas/comment.schemas.ts`
  - Command: `rm apps/web/src/server/domain/workflow/schemas/*.ts`
- [x] cleanup-2 Delete schemas directory if empty
  - Command: `rmdir apps/web/src/server/domain/workflow/schemas`
  - Only if no other files remain
- [x] cleanup-3 Run type checking
  - Command: `cd apps/web && pnpm check-types`
  - Expected: No TypeScript errors
  - Fix any import path issues
- [x] cleanup-4 Run linter
  - Command: `cd apps/web && pnpm lint`
  - Expected: No lint errors
  - Fix any unused import warnings
- [x] cleanup-5 Document shared schema pattern in CLAUDE.md
  - Add section: "Shared Schemas vs Domain Types (Hybrid Approach)"
  - File: `apps/web/CLAUDE.md`
  - Document: What to share (validation schemas, enums) vs keep separate (model interfaces)
  - Document: Type derivation pattern with z.infer<> for enums
  - Document: Why backend uses Prisma types directly (111 usages)
  - Document: Why frontend defines custom interfaces (UI extensions)
  - Include value vs confusion matrix from analysis

#### Completion Notes

- Deleted all old schema files from `server/domain/workflow/schemas/`
- Deleted schemas directory (now empty)
- Type checking passed with no errors
- Linting passed with no errors (fixed unused artifactTypeSchema import)
- Added comprehensive documentation section to `apps/web/CLAUDE.md` explaining hybrid approach
- Documented what to share vs keep separate with rationale and examples
- Included type derivation pattern, import patterns, and value vs confusion matrix
- Fixed Zod z.record() calls to use two parameters (key type, value type) for compatibility with newer Zod versions

## Testing Strategy

### Unit Tests

No new unit tests required. Existing tests should continue to pass.

**Verify**:
- All route validation tests pass (schemas moved but logic identical)
- Frontend type tests pass (field name changes may affect tests)

### Integration Tests

**API Response Validation**:
```typescript
describe('Workflow API', () => {
  it('should validate response with optional relations', async () => {
    const response = await fetch('/api/workflow-executions/123');
    const data = await response.json();

    // Should include optional relations if requested
    expect(data.data.steps).toBeDefined();
    expect(data.data.events).toBeDefined();
  });
});
```

### Manual Testing

1. Create workflow run via API - verify validation works
2. Fetch execution with relations - verify optional fields present
3. Check frontend workflow list - verify field names correct
4. Check frontend workflow detail - verify step data displays

## Success Criteria

- [ ] All workflow validation schemas moved to `apps/web/src/shared/schemas/`
- [ ] Enum types derived from schemas via `z.infer<>` and exported
- [ ] Backend routes import validation schemas from `@/shared/schemas` (3 files)
- [ ] Frontend imports only enum types from shared schemas (not full interfaces)
- [ ] No duplicate enum definitions between frontend and backend
- [ ] Frontend `WorkflowRun` interface stays in frontend types (not shared)
- [ ] Backend continues using Prisma-generated types (no manual interfaces)
- [ ] Step field names fixed: `name` and `phase` (not `step_name`/`phase_name`)
- [ ] Artifact schema field fixed: `workflow_event_id` (not `workflow_comment_id`)
- [ ] Optional relation fields added to response schemas
- [ ] Old domain schema files deleted
- [ ] Type checking passes: `pnpm check-types`
- [ ] Linting passes: `pnpm lint`
- [ ] All existing tests pass
- [ ] Hybrid approach documented in CLAUDE.md

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors, all imports resolve correctly

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors or warnings

# Unit tests
cd apps/web && pnpm test
# Expected: All tests pass (31+ test files)

# Build verification
cd apps/web && pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: Project → Workflows
3. Verify: Workflow list displays correctly
4. Create new workflow run
5. Verify: Validation works (try invalid input)
6. View workflow run detail
7. Verify: Step data displays with correct field names
8. Check browser console: No errors or warnings
9. Check server logs: Validation errors logged properly

**Feature-Specific Checks:**

- Verify `apps/web/src/shared/schemas/workflow.schemas.ts` exists and exports all schemas
- Verify old schema files deleted from `server/domain/workflow/schemas/`
- Verify frontend `WorkflowRunStep` uses `name` and `phase` fields
- Verify backend routes import from `@/shared/schemas`
- Verify no duplicate type definitions in codebase
- Run: `grep -r "export type WorkflowStatus" apps/web/src/` - should only find shared schemas
- Run: `grep -r "step_name" apps/web/src/client/` - should find no occurrences after fix

## Implementation Notes

### 1. Hybrid Approach Rationale

**Share validation schemas and enums** - High value, low confusion:
- ✅ Single source of truth for validation rules
- ✅ Client-side validation matches server-side
- ✅ Enum types derived from schemas prevent drift
- ✅ No coupling between layers

**Keep model interfaces separate** - Prevents coupling:
- ✅ Backend uses Prisma-generated types directly (111 usages in codebase)
- ✅ Frontend defines interfaces with UI extensions (12 definitions)
- ✅ Each layer free to change without affecting the other
- ✅ No risk of shared interface constraining either side

### 2. Type Derivation Pattern (Enums Only)

Derive enum types from schemas, keep models separate:

```typescript
// ✅ GOOD - Shared enum type derived from schema
export const workflowStatusSchema = z.enum(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled']);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

// ✅ GOOD - Frontend uses shared enum in custom interface
import type { WorkflowStatus } from '@/shared/schemas';

export interface WorkflowRun {
  id: string;
  status: WorkflowStatus; // ← Uses shared enum
  // ... other fields frontend needs
}

// ❌ BAD - Don't share full model interfaces
export interface WorkflowRun extends z.infer<typeof workflowExecutionResponseSchema> {
  // This couples frontend to backend response shape
}
```

### 3. What to Share vs Keep Separate

**✅ SHARE (Low Coupling Risk):**
- Validation schemas (createWorkflowRunSchema, etc.)
- Enum schemas and derived types (WorkflowStatus, StepStatus)
- Request/response schemas for API contracts

**❌ DON'T SHARE (High Coupling Risk):**
- Model interfaces (WorkflowRun, WorkflowRunStep)
- Prisma-generated types (backend only)
- Frontend UI types (filters, computed fields)
- Backend service types (CreateWorkflowRunInput)

**Evidence from codebase:**
- Backend: 111 Prisma client usages → uses generated types
- Frontend: 12 manual interface definitions → custom needs

### 4. Import Path Consistency

All shared schema imports should use `@/shared/schemas` alias for consistency.

## Dependencies

- No new dependencies required
- Uses existing: zod (already installed)

## Timeline

| Task                          | Estimated Time |
| ----------------------------- | -------------- |
| Phase 1: Shared Infrastructure| 0.75 hours     |
| Phase 2: Backend Updates      | 0.5 hours      |
| Phase 3: Frontend Updates     | 0.5 hours      |
| Phase 4: Cleanup & Docs       | 0.75 hours     |
| Testing & Verification        | 0.5 hours      |
| **Total**                     | **2-3 hours**  |

## References

- Architecture Audit findings (conversation context)
- Spec #44: Workflow Type Safety & Architecture Refactor
- Zod documentation: https://zod.dev
- TypeScript type inference: https://www.typescriptlang.org/docs/handbook/type-inference.html

## Next Steps

1. Run `/implement-spec 45` to begin implementation
2. Execute tasks in order from Phase 1 through Phase 4
3. Run validation commands after each phase
4. Test thoroughly before moving spec to done/
5. Consider follow-up: Add client-side form validation using shared schemas
