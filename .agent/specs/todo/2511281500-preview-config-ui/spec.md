# Preview Config UI

**Status**: completed
**Created**: 2025-11-28
**Package**: apps/app
**Total Complexity**: 38 points
**Phases**: 3
**Tasks**: 9
**Overall Avg Complexity**: 4.2/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Type System | 4 | 13 | 3.3/10 | 4/10 |
| Phase 2: Backend Service | 2 | 8 | 4.0/10 | 5/10 |
| Phase 3: Frontend UI | 3 | 17 | 5.7/10 | 7/10 |
| **Total** | **9** | **38** | **4.2/10** | **7/10** |

## Overview

Add preview container configuration UI to the ProjectDialog component, allowing users to configure default settings for preview containers. Also refactor `createContainer.ts` to use `getProjectById` service instead of direct Prisma calls for cross-domain data access.

## User Story

As a developer
I want to configure preview container defaults in my project settings
So that I don't have to specify them in every workflow that uses `step.preview()`

## Technical Approach

1. Add `ProjectPreviewConfig` type to shared types
2. Update `getProjectById` to include `preview_config` in response
3. Refactor `createContainer.ts` to use the service instead of direct Prisma
4. Add preview settings collapsible section to ProjectDialog (edit mode only)
5. Update schemas and form validation

## Key Design Decisions

1. **Modify existing `getProjectById`** - Simpler than creating new service, just add `preview_config` to returned fields
2. **Collapsible UI section** - Only shown in edit mode, keeps dialog clean for create flow
3. **No file picker** - Users can type path directly, file picker extraction is ~4-6 hours of additional work
4. **Comma-separated ports** - Simple text input parsed to array, avoids complex dynamic form

## Architecture

### File Structure

```
shared/types/
└── project.types.ts          # Add ProjectPreviewConfig

server/domain/project/
├── schemas/index.ts          # Add previewConfigSchema
├── services/getProjectById.ts # Include preview_config
└── types/UpdateProjectOptions.ts # Add preview_config

server/domain/container/
└── services/createContainer.ts # Use getProjectById service

client/pages/projects/components/
└── ProjectDialog.tsx          # Add preview settings section
```

### Integration Points

**Type System**:
- `shared/types/project.types.ts` - Add ProjectPreviewConfig, update Project and UpdateProjectRequest
- `server/domain/project/schemas/index.ts` - Add Zod validation

**Backend Service**:
- `server/domain/project/services/getProjectById.ts` - Include preview_config in transform
- `server/domain/container/services/createContainer.ts` - Use getProjectById

**Frontend**:
- `client/pages/projects/components/ProjectDialog.tsx` - Add collapsible preview settings

## Implementation Details

### 1. ProjectPreviewConfig Type

Shared type for preview container configuration:

```typescript
export interface ProjectPreviewConfig {
  dockerFilePath?: string;       // Relative path to Docker file
  ports?: string[];              // Named ports (e.g., ["app", "server"])
  env?: Record<string, string>;  // Environment variables
  maxMemory?: string;            // e.g., "1g", "512m"
  maxCpus?: string;              // e.g., "1.0", "0.5"
}
```

### 2. Preview Settings UI

Collapsible section in ProjectDialog with:
- Docker File Path: text input
- Port Names: comma-separated text input
- Environment Variables: textarea (KEY=value per line)
- Max Memory/CPUs: text inputs in 2-column grid

## Files to Create/Modify

### New Files (0)

None - all changes to existing files.

### Modified Files (6)

1. `apps/app/src/shared/types/project.types.ts` - Add ProjectPreviewConfig, update interfaces
2. `apps/app/src/server/domain/project/schemas/index.ts` - Add previewConfigSchema
3. `apps/app/src/server/domain/project/types/UpdateProjectOptions.ts` - Add preview_config
4. `apps/app/src/server/domain/project/services/getProjectById.ts` - Include preview_config
5. `apps/app/src/server/domain/container/services/createContainer.ts` - Use getProjectById service
6. `apps/app/src/client/pages/projects/components/ProjectDialog.tsx` - Add preview settings UI

## Step by Step Tasks

### Phase 1: Type System

**Phase Complexity**: 13 points (avg 3.3/10)

- [x] 1.1 [3/10] Add ProjectPreviewConfig type to shared types
  - Add interface with dockerFilePath, ports, env, maxMemory, maxCpus fields
  - File: `apps/app/src/shared/types/project.types.ts`

- [x] 1.2 [3/10] Update Project interface to include preview_config
  - Add `preview_config?: ProjectPreviewConfig | null` field
  - File: `apps/app/src/shared/types/project.types.ts`

- [x] 1.3 [3/10] Update UpdateProjectRequest interface
  - Add `preview_config?: ProjectPreviewConfig | null` field
  - File: `apps/app/src/shared/types/project.types.ts`

- [x] 1.4 [4/10] Add previewConfigSchema to project schemas
  - Create Zod schema for ProjectPreviewConfig
  - Update updateProjectSchema to include preview_config
  - File: `apps/app/src/server/domain/project/schemas/index.ts`
  - File: `apps/app/src/server/domain/project/types/UpdateProjectOptions.ts`

#### Completion Notes

- Added ProjectPreviewConfig interface with all 5 optional fields
- Updated Project and UpdateProjectRequest interfaces with preview_config field
- Created previewConfigSchema as nullable Zod schema
- Updated both updateProjectSchema and updateProjectOptionsSchema

### Phase 2: Backend Service

**Phase Complexity**: 8 points (avg 4.0/10)

- [x] 2.1 [3/10] Update getProjectById to include preview_config
  - Add preview_config to transformProject function
  - File: `apps/app/src/server/domain/project/services/getProjectById.ts`

- [x] 2.2 [5/10] Refactor createContainer to use getProjectById service
  - Replace direct `prisma.project.findUnique()` call with `getProjectById()`
  - Import from project domain services
  - Update to access preview_config from returned Project type
  - File: `apps/app/src/server/domain/container/services/createContainer.ts`

#### Completion Notes

- getProjectById now returns preview_config from Prisma JSON field
- createContainer uses getProjectById instead of direct Prisma call
- Removed duplicate private interface, now uses shared ProjectPreviewConfig type
- Cross-domain access now follows proper service pattern

### Phase 3: Frontend UI

**Phase Complexity**: 17 points (avg 5.7/10)

- [x] 3.1 [5/10] Add preview config form fields to schema
  - Update projectFormSchema with dockerFilePath, ports, env, maxMemory, maxCpus
  - All fields are strings (ports comma-separated, env multi-line)
  - File: `apps/app/src/client/pages/projects/components/ProjectDialog.tsx`

- [x] 3.2 [5/10] Add helper functions for parsing/conversion
  - `parsePortsString(str)` - comma-separated to array
  - `parseEnvString(str)` - multi-line KEY=value to object
  - `portsToString(arr)` - array to comma-separated
  - `envToString(obj)` - object to multi-line string
  - File: `apps/app/src/client/pages/projects/components/ProjectDialog.tsx`

- [x] 3.3 [7/10] Add Preview Settings collapsible section
  - Add Collapsible component import
  - Add Textarea component import
  - Update form reset useEffect to include preview config fields
  - Add collapsible section with all fields (edit mode only)
  - Update submit handler to build preview_config object
  - File: `apps/app/src/client/pages/projects/components/ProjectDialog.tsx`

#### Completion Notes

- Added all preview config fields to form schema as optional strings
- Implemented helper functions for bidirectional conversion (ports/env)
- Added buildPreviewConfig() to construct final object, returns null if empty
- Collapsible section with ChevronDown icon, only shown in edit mode
- Form reset properly populates preview config from project data

## Testing Strategy

### Unit Tests

Existing tests should continue to pass. No new tests required for this scope.

### Manual Testing

1. Create a project
2. Edit the project
3. Expand Preview Settings section
4. Fill in all fields:
   - Docker File Path: `docker-compose.yml`
   - Port Names: `app, server`
   - Environment Variables: `NODE_ENV=preview\nAPI_KEY=test`
   - Max Memory: `1g`
   - Max CPUs: `1.0`
5. Save and verify data persisted
6. Reopen dialog and verify values loaded correctly
7. Run a workflow with `step.preview()` and verify it uses project defaults

## Success Criteria

- [ ] ProjectPreviewConfig type exported from shared types
- [ ] Project interface includes preview_config field
- [ ] UpdateProjectRequest includes preview_config field
- [ ] getProjectById returns preview_config in response
- [ ] createContainer uses getProjectById service (no direct Prisma)
- [ ] ProjectDialog shows Preview Settings section in edit mode
- [ ] Preview config saves and loads correctly
- [ ] Type check passes: `pnpm check-types`
- [ ] Tests pass: `pnpm test`

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Tests
pnpm test
# Expected: All tests pass

# Build
pnpm build
# Expected: Build succeeds
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to project list, click edit on a project
3. Verify Preview Settings collapsible appears
4. Fill in all preview config fields
5. Save and reopen - verify values persist
6. Check database via Prisma Studio: `pnpm prisma:studio`
7. Verify preview_config JSON field has correct values

## Implementation Notes

### 1. Form Field Conversions

The form uses string inputs that get converted on save:
- Ports: `"app, server"` → `["app", "server"]`
- Env: `"KEY=val\nKEY2=val2"` → `{ KEY: "val", KEY2: "val2" }`

### 2. Preview Config Null vs Undefined

- Empty preview config should be saved as `null` (not empty object)
- On load, `null` should display as empty fields
- Only save preview_config if at least one field has a value

## Dependencies

No new dependencies required.

## References

- Original spec: `.agent/specs/done/2511271430-preview-containers/spec.md`
- Plan file: `/Users/jnarowski/.claude/plans/crispy-leaping-toast.md`
- Existing getProjectById: `apps/app/src/server/domain/project/services/getProjectById.ts`
- Existing ProjectDialog: `apps/app/src/client/pages/projects/components/ProjectDialog.tsx`

## Next Steps

1. Implement Phase 1 (Type System)
2. Implement Phase 2 (Backend Service)
3. Implement Phase 3 (Frontend UI)
4. Run validation commands
5. Manual testing

## Review Findings

**Review Date:** 2025-11-28
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feature/preview-containers-v2
**Commits Reviewed:** 9

### Summary

✅ **Implementation is complete.** All spec requirements have been verified and implemented correctly. No HIGH or MEDIUM priority issues found.

### Verification Details

**Spec Compliance:**

- ✅ All phases implemented as specified
- ✅ All acceptance criteria met
- ✅ All files modified as documented

**Phase 1: Type System**

**Status:** ✅ Complete - All type definitions correctly implemented

- ✅ Task 1.1: `ProjectPreviewConfig` type added to `project.types.ts:5-11` with all 5 fields (dockerFilePath, ports, env, maxMemory, maxCpus)
- ✅ Task 1.2: `Project` interface updated with `preview_config?: ProjectPreviewConfig | null` at line 39
- ✅ Task 1.3: `UpdateProjectRequest` interface updated with `preview_config` at line 57
- ✅ Task 1.4: `previewConfigSchema` added to `schemas/index.ts:11-17`, `updateProjectSchema` includes it at line 41, `updateProjectOptionsSchema` includes it at line 13

**Phase 2: Backend Service**

**Status:** ✅ Complete - Backend services properly implemented

- ✅ Task 2.1: `getProjectById` returns `preview_config` in transform function at line 61
- ✅ Task 2.2: `createContainer` uses `getProjectById` service at line 38 (no direct Prisma calls for cross-domain access)

**Phase 3: Frontend UI**

**Status:** ✅ Complete - UI properly implemented

- ✅ Task 3.1: Form fields added to `projectFormSchema` at lines 32-36 (dockerFilePath, ports, env, maxMemory, maxCpus)
- ✅ Task 3.2: All helper functions implemented at lines 43-98:
  - `parsePortsString()` - comma-separated to array
  - `parseEnvString()` - multi-line KEY=value to object
  - `portsToString()` - array to comma-separated
  - `envToString()` - object to multi-line string
  - `buildPreviewConfig()` - constructs final object, returns null if empty
- ✅ Task 3.3: Collapsible Preview Settings section at lines 284-370:
  - Collapsible + CollapsibleTrigger + CollapsibleContent components used
  - ChevronDown icon with rotation animation
  - Only shown in edit mode (`{isEditMode && ...}`)
  - All fields present: Docker File Path, Port Names, Environment Variables, Max Memory, Max CPUs
  - Form reset properly populates preview config from project data (lines 140-167)

**Code Quality:**

- ✅ Error handling implemented correctly
- ✅ Type safety maintained
- ✅ No code duplication
- ✅ Follows project patterns (Collapsible component, form handling)

### Positive Findings

**Well-implemented features:**
- Clean separation of form fields (strings) from API fields (arrays/objects)
- `buildPreviewConfig()` returns null for empty config instead of empty object
- Collapsible component provides clean UX for optional settings
- Form reset handles both create and edit modes correctly
- Helper functions are pure and well-documented
- Proper import structure following project conventions (@/ aliases)

**Good architecture decisions:**
- Using `getProjectById` service instead of direct Prisma calls in `createContainer` maintains proper domain boundaries
- Nullable preview_config matches database JSON column semantics
- Preview settings only shown in edit mode keeps create flow simple

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [x] All acceptance criteria met
- [x] Implementation ready for use
