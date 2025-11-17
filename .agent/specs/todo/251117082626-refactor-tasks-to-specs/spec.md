# Refactor Tasks to Specs Terminology

**Status:** draft
**Type:** feature
**Created:** 2025-11-17T08:26:26.000Z

## Problem

Codebase uses "Tasks" and "Specs" terminology inconsistently:

- **Database schema**: Uses `spec_file`, `spec_type`, `spec_content` (correct)
- **File system**: `.agent/specs/` directory (correct)
- **Backend domain**: `domain/task/` (inconsistent - should be `spec`)
- **Backend routes**: `/api/tasks` (inconsistent - should be `specs`)
- **Frontend hooks**: `useTasks`, `useRescanTasks` (inconsistent)
- **Frontend components**: `NavTasks`, `ProjectHomeTasks` (inconsistent)
- **Types**: `SpecTask`, `TasksResponse` (hybrid names - should be `Spec`, `SpecsResponse`)

Philosophy: All work (features, bugs, chores) requires specifications. "Specs" is the authoritative term.

## Goals

1. Rename all "Task" terminology to "Specs" across the codebase
2. Achieve consistent naming: domain folder, routes, types, hooks, components
3. No backwards compatibility needed (clean break)
4. Update API endpoints from `/api/tasks` to `/api/specs`
5. Maintain functionality while improving code clarity

## Success Criteria

- [ ] All backend files use "spec" terminology
- [ ] All frontend files use "spec" terminology
- [ ] All API routes use `/api/specs/*` format
- [ ] All types use `Spec`-based naming (no `Task` references)
- [ ] Build passes (`pnpm build`)
- [ ] Type check passes (`pnpm check-types`)
- [ ] Tests pass (`pnpm test`)
- [ ] Manual verification: UI shows specs correctly

## Implementation Plan

### Phase 1: Shared Types & API Contracts

**Goal:** Update shared types to use consistent "Spec" naming

**Tasks:**

1. **Rename `task.types.ts` to `spec.types.ts`** (Complexity: 3/10)
   - Location: `apps/app/src/shared/types/task.types.ts`
   - Rename to: `apps/app/src/shared/types/spec.types.ts`
   - Update all imports across codebase

2. **Rename types within `spec.types.ts`** (Complexity: 2/10)
   - `SpecTask` → `Spec`
   - `TasksResponse` → `SpecsResponse`
   - Update JSDoc comments to reference "specs" not "tasks"

3. **Update API route schemas** (Complexity: 3/10)
   - Location: `apps/app/src/server/routes/tasks.ts`
   - Rename `TasksQuerySchema` → `SpecsQuerySchema`
   - Update schema comments

**Files Modified:**
- `apps/app/src/shared/types/task.types.ts` → `spec.types.ts`
- `apps/app/src/server/routes/tasks.ts`
- All files importing from `task.types.ts`

**Validation:**
- Type check passes
- No compilation errors

---

### Phase 2: Backend Domain & Routes

**Goal:** Rename backend domain folder, services, routes from "task" to "spec"

**Tasks:**

1. **Rename domain folder** (Complexity: 4/10)
   - Move: `apps/app/src/server/domain/task/` → `domain/spec/`
   - Update all imports referencing `domain/task`

2. **Rename service files** (Complexity: 5/10)
   - `getTasks.ts` → `getSpecs.ts`
   - `getTasks.test.ts` → `getSpecs.test.ts`
   - Update function names:
     - `getTasks` → `getSpecs`
     - `clearTasksCache` → `clearSpecsCache`

3. **Update `scanSpecs.ts`** (Complexity: 3/10)
   - Update type imports: `SpecTask` → `Spec`
   - Update JSDoc comments
   - Update return type: `Promise<SpecTask[]>` → `Promise<Spec[]>`
   - Update variable names: `specTasks` → `specs`

4. **Rename routes file** (Complexity: 5/10)
   - Move: `routes/tasks.ts` → `routes/specs.ts`
   - Update route paths: `/api/tasks` → `/api/specs`
   - Update route paths: `/api/tasks/rescan` → `/api/specs/rescan`
   - Update function name: `taskRoutes` → `specRoutes`
   - Update all variable names: `tasks` → `specs`
   - Update log messages

5. **Update route registration** (Complexity: 2/10)
   - Location: `apps/app/src/server/routes.ts`
   - Update import: `taskRoutes` → `specRoutes`
   - Update registration call

**Files Modified:**
- `apps/app/src/server/domain/task/` → `domain/spec/`
- `apps/app/src/server/domain/task/services/getTasks.ts` → `domain/spec/services/getSpecs.ts`
- `apps/app/src/server/domain/task/services/getTasks.test.ts` → `domain/spec/services/getSpecs.test.ts`
- `apps/app/src/server/domain/task/services/scanSpecs.ts`
- `apps/app/src/server/domain/task/services/scanSpecs.test.ts`
- `apps/app/src/server/routes/tasks.ts` → `routes/specs.ts`
- `apps/app/src/server/routes.ts`

**Validation:**
- Server starts successfully
- API endpoints respond at `/api/specs`
- Tests pass

---

### Phase 3: Frontend Hooks

**Goal:** Rename frontend data fetching hooks from "tasks" to "specs"

**Tasks:**

1. **Rename `useTasks.ts` to `useSpecs.ts`** (Complexity: 6/10)
   - Location: `apps/app/src/client/hooks/useTasks.ts`
   - Rename to: `apps/app/src/client/hooks/useSpecs.ts`
   - Update hook name: `useTasks` → `useSpecs`
   - Update function names: `fetchTasks` → `fetchSpecs`
   - Update API endpoint: `/api/tasks` → `/api/specs`
   - Update query key: `["tasks", ...]` → `["specs", ...]`
   - Update type imports: `TasksResponse` → `SpecsResponse`
   - Update all imports across codebase

2. **Rename `useRescanTasks.ts` to `useRescanSpecs.ts`** (Complexity: 6/10)
   - Location: `apps/app/src/client/hooks/useRescanTasks.ts`
   - Rename to: `apps/app/src/client/hooks/useRescanSpecs.ts`
   - Update hook name: `useRescanTasks` → `useRescanSpecs`
   - Update function names: `rescanTasks` → `rescanSpecs`
   - Update API endpoint: `/api/tasks/rescan` → `/api/specs/rescan`
   - Update query key invalidation: `["tasks"]` → `["specs"]`
   - Update toast messages: "Tasks rescanned" → "Specs rescanned"
   - Update all imports across codebase

**Files Modified:**
- `apps/app/src/client/hooks/useTasks.ts` → `useSpecs.ts`
- `apps/app/src/client/hooks/useRescanTasks.ts` → `useRescanSpecs.ts`
- All components importing these hooks

**Validation:**
- Frontend compiles
- Type check passes
- React Query cache keys updated correctly

---

### Phase 4: Frontend Components

**Goal:** Rename frontend components from "Tasks" to "Specs"

**Tasks:**

1. **Rename `NavTasks.tsx` to `NavSpecs.tsx`** (Complexity: 7/10)
   - Location: `apps/app/src/client/components/sidebar/NavTasks.tsx`
   - Rename to: `apps/app/src/client/components/sidebar/NavSpecs.tsx`
   - Update component name: `NavTasks` → `NavSpecs`
   - Update hook imports: `useTasks` → `useSpecs`, `useRescanTasks` → `useRescanSpecs`
   - Update variable names throughout component
   - Update all imports across codebase (especially sidebar usage)

2. **Rename `ProjectHomeTasks.tsx` to `ProjectHomeSpecs.tsx`** (Complexity: 7/10)
   - Location: `apps/app/src/client/pages/projects/components/ProjectHomeTasks.tsx`
   - Rename to: `apps/app/src/client/pages/projects/components/ProjectHomeSpecs.tsx`
   - Update component name: `ProjectHomeTasks` → `ProjectHomeSpecs`
   - Update props interface: `ProjectHomeTasksProps` → `ProjectHomeSpecsProps`
   - Update hook imports: `useTasks` → `useSpecs`, `useRescanTasks` → `useRescanSpecs`
   - Update variable names: `task` → `spec`, `tasks` → `specs`
   - Update function names: `handleOpenWorkflow` parameters
   - Update all imports across codebase (especially tab component usage)

**Files Modified:**
- `apps/app/src/client/components/sidebar/NavTasks.tsx` → `NavSpecs.tsx`
- `apps/app/src/client/pages/projects/components/ProjectHomeTasks.tsx` → `ProjectHomeSpecs.tsx`
- Any parent components importing these

**Validation:**
- Components render correctly
- No console errors
- Navigation works as expected

---

### Phase 5: UI Labels & Messages

**Goal:** Update user-facing text to use "Specs" terminology consistently

**Tasks:**

1. **Update `NavSpecs.tsx` UI labels** (Complexity: 2/10)
   - Change section header: Already shows "Specs" (verify)
   - Update aria-labels: "Refresh tasks" → "Refresh specs"
   - Update empty state: "No tasks" → "No specs"
   - Update loading message: "Loading tasks..." → "Loading specs..."
   - Update error message: "Failed to load tasks" → "Failed to load specs"

2. **Update `ProjectHomeSpecs.tsx` UI labels** (Complexity: 2/10)
   - Change section header: Already shows "Specs" (verify)
   - Update aria-labels: "Refresh tasks" → "Refresh specs"
   - Update empty state: "No tasks" → "No specs"
   - Update loading message: "Loading tasks..." → "Loading specs..."
   - Update error message: "Failed to load tasks" → "Failed to load specs"

**Files Modified:**
- `apps/app/src/client/components/sidebar/NavSpecs.tsx`
- `apps/app/src/client/pages/projects/components/ProjectHomeSpecs.tsx`

**Validation:**
- UI shows "Specs" terminology consistently
- No references to "Tasks" remain in user-facing text

---

## Testing Strategy

### Unit Tests

- [ ] `getSpecs.test.ts`: Verify service returns specs correctly
- [ ] `scanSpecs.test.ts`: Verify spec scanning logic

### Integration Tests

- [ ] `routes/specs.test.ts`: Verify `/api/specs` endpoint
- [ ] `routes/specs.test.ts`: Verify `/api/specs/rescan` endpoint

### Manual Testing

- [ ] Navigate to sidebar → Verify "Specs" section shows
- [ ] Click refresh icon → Verify specs rescan
- [ ] Navigate to project home → Verify "Specs" tab shows
- [ ] Click spec → Verify navigation to workflow creation
- [ ] Check browser console → No errors

### Build Validation

```bash
# From root
pnpm build          # Verify production build
pnpm check-types    # Verify TypeScript types
pnpm test           # Verify all tests pass
```

## Rollback Plan

If issues arise:

1. Revert commits in reverse order
2. Restore original file names via git
3. No database changes needed (schema already uses "spec")

## Notes

- Database schema already uses correct "spec" terminology - no migration needed
- File system already uses `.agent/specs/` - no changes needed
- Breaking change: API clients must update from `/api/tasks` to `/api/specs`

## Complexity Summary

**Total Context Window Usage:** Medium (30-40/100)

- **Phase 1:** Low (8/30)
- **Phase 2:** Medium (19/50)
- **Phase 3:** Medium (12/50)
- **Phase 4:** Medium-High (14/50)
- **Phase 5:** Low (4/30)

**Estimated Implementation Time:** 2-3 hours

**Risk Level:** Low (mostly renames with clear find-replace patterns)
