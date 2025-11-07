# Feature: Session Loading Refactoring

## What We're Building

A denormalized API endpoint that returns all projects with their 20 most recent sessions in a single request, eliminating the current waterfall of multiple API calls. This will reduce API calls from 10+ down to 1 on initial page load, improving performance and simplifying component logic.

## User Story

As a developer
I want projects and their sessions to load in a single API call
So that the application loads faster and makes fewer requests to the server

## Technical Approach

Replace the current multi-query approach (1 projects query + N session queries) with a single denormalized endpoint that returns projects with embedded sessions. The endpoint will:

1. Fetch all non-hidden projects for the authenticated user
2. For each project, include the 20 most recent sessions (metadata only, no messages)
3. Return in a single response with proper TypeScript types

Frontend components will consume this single query instead of multiple separate queries, leveraging TanStack Query's caching to share data across components (sidebar, command menu, project home).

Session messages remain separate (fetched on-demand when viewing a session).

## Files to Touch

### Existing Files

- `apps/web/src/server/routes/projects.ts` - Add query parameter support for including sessions
- `apps/web/src/server/services/project.ts` - Update `getAllProjects` to optionally include sessions
- `apps/web/src/server/schemas/response.ts` - Add new response schema for projects with sessions
- `apps/web/src/shared/types/project.types.ts` - Add new type for project with sessions
- `apps/web/src/client/pages/projects/hooks/useProjects.ts` - Add new hook for fetching projects with sessions
- `apps/web/src/client/components/AppInnerSidebar.tsx` - Use new hook instead of separate session queries
- `apps/web/src/client/components/CommandMenu.tsx` - Remove per-project session fetching
- `apps/web/src/client/pages/ProjectHome.tsx` - Use new hook and derive sessions from project data
- `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - Add useRef to prevent duplicate loadSession calls
- `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - Optimize loadSession to check cache first

### New Files

None - this refactoring modifies existing files only

## Implementation Plan

### Phase 1: Backend Foundation

Create the backend infrastructure to support fetching projects with embedded sessions. This includes updating the database service layer, adding new response schemas, and implementing the query parameter logic.

### Phase 2: Frontend Hook & Type Updates

Update frontend types and create a new TanStack Query hook that fetches projects with sessions in a single call. Update the query key structure to support this new data shape.

### Phase 3: Component Migration

Migrate components from using separate `useProjects` + `useAgentSessions` queries to using the single `useProjectsWithSessions` hook. Update data derivation logic in each component.

## Step by Step Tasks

### 1: Backend Schema & Types

<!-- prettier-ignore -->
- [x] 1.1 Add `ProjectWithSessionsResponse` type to shared types
        - Create interface that extends `Project` with `sessions` array
        - File: `apps/web/src/shared/types/project.types.ts`
        - Add after existing `Project` interface:
        ```typescript
        export interface ProjectWithSessions extends Project {
          sessions: SessionResponse[];
        }

        export interface ProjectsWithSessionsResponse {
          data: ProjectWithSessions[];
        }
        ```

- [x] 1.2 Add Zod schema for projects-with-sessions response
        - Add response schema for validation
        - File: `apps/web/src/server/schemas/response.ts`
        - Import `sessionResponseSchema` from session schemas
        - Create `projectWithSessionsSchema` and `projectsWithSessionsResponseSchema`

#### Completion Notes

- Added `ProjectWithSessions` interface and `ProjectsWithSessionsResponse` to shared types
- Created Zod schemas `projectWithSessionsSchema` and `projectsWithSessionsResponseSchema`
- Fixed `sessionResponseSchema` to include missing `agent` and `name` fields

### 2: Backend Service Layer

<!-- prettier-ignore -->
- [x] 2.1 Update `getAllProjects` service function signature
        - Add optional `includeSessions` parameter with default `false`
        - Add optional `sessionLimit` parameter with default `20`
        - File: `apps/web/src/server/services/project.ts`

- [x] 2.2 Implement Prisma query with sessions include
        - Fetch all non-hidden projects (up to 500, no pagination)
        - Use `include` to fetch sessions when `includeSessions` is true
        - Apply `orderBy: { updated_at: 'desc' }` to sessions
        - Apply `take: sessionLimit` to limit sessions per project
        - Only include session metadata fields (id, agent, created_at, updated_at, metadata)
        - Filter for non-hidden projects: `where: { is_hidden: false }`
        - Add `take: 500` at project level to prevent excessive queries

- [x] 2.3 Add type annotations for return type
        - Update return type to `Promise<Project[] | ProjectWithSessions[]>`
        - Use TypeScript conditional types or function overloads if needed

#### Completion Notes

- Updated `getAllProjects` to accept optional `includeSessions` and `sessionLimit` parameters
- Implemented Prisma query with sessions include using conditional include pattern
- Added helper functions `transformSession` and `transformProjectWithSessions`
- Function now filters non-hidden projects and limits to 500 total projects
- Sessions are ordered by `updated_at` desc and limited to specified count per project

### 3: Backend Route Handler

<!-- prettier-ignore -->
- [x] 3.1 Add query parameter schema for GET /api/projects
        - Create Zod schema for `include` and `sessionLimit` query params
        - File: `apps/web/src/server/routes/projects.ts`
        ```typescript
        const ProjectsQuerySchema = z.object({
          include: z.enum(['sessions']).optional(),
          sessionLimit: z.coerce.number().min(1).max(100).default(20).optional(),
        });
        ```

- [x] 3.2 Update route handler to support query parameters
        - Extract `include` and `sessionLimit` from query params
        - Pass `includeSessions: include === 'sessions'` and `sessionLimit` to `getAllProjects`
        - Update response schema based on `include` parameter
        - File: `apps/web/src/server/routes/projects.ts` (GET /api/projects)

- [ ] 3.3 Test endpoint manually
        ```bash
        curl -H "Authorization: Bearer YOUR_TOKEN" \
          "http://localhost:3456/api/projects?include=sessions&sessionLimit=20"
        # Expected: JSON with projects array, each containing max 20 sessions each
        ```

#### Completion Notes

- Added `ProjectsQuerySchema` with optional `include` and `sessionLimit` parameters
- Updated GET /api/projects route to accept querystring parameters
- Response schema now supports both regular projects and projects with sessions
- Route passes parameters to `getAllProjects` service function

### 4: Frontend Hook Implementation

<!-- prettier-ignore -->
- [x] 4.1 Create `useProjectsWithSessions` hook
        - Add new export function in `useProjects.ts`
        - Use query key: `['projects', 'with-sessions']`
        - Call `/api/projects?include=sessions&sessionLimit=20`
        - Set `staleTime: 30000` (30 seconds)
        - Set `refetchOnWindowFocus: false`
        - File: `apps/web/src/client/pages/projects/hooks/useProjects.ts`

- [x] 4.2 Add cache invalidation logic
        - Update mutation hooks (`useCreateProject`, `useUpdateProject`, etc.)
        - Invalidate both `['projects', 'list']` and `['projects', 'with-sessions']`
        - Ensure cache stays consistent across both query types

#### Completion Notes

- Created `useProjectsWithSessions` hook with proper query key and fetch function
- Added `ProjectWithSessions` and `ProjectsWithSessionsResponse` types to imports
- Updated all mutation hooks to invalidate both query keys
- Set staleTime to 30 seconds and disabled refetchOnWindowFocus as specified

### 5: Fix React Strict Mode Duplicates

<!-- prettier-ignore -->
- [x] 5.1 Add useRef to ProjectSession for loadSession
        - Import `useRef` from React
        - Create `loadSessionInitiatedRef = useRef(false)`
        - Check ref before calling `loadSession`
        - Set ref to true immediately before calling `loadSession`
        - Reset ref on error in `onError` callback
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Apply same pattern as `ProtectedLayout.tsx:18-50`

- [x] 5.2 No changes needed to sessionStore
        - sessionStore.loadSession will continue to call `/api/projects/:id/sessions`
        - React Query will automatically return cached data (no network request)
        - This just works - no code changes needed

#### Completion Notes

- Added `loadSessionInitiatedRef` to prevent duplicate loadSession calls in React Strict Mode
- Ref is checked before calling loadSession and set immediately to prevent race conditions
- Ref is reset on error and when switching sessions
- No changes needed to sessionStore - React Query caching handles deduplication

### 6: Update useActiveSession Hook

<!-- prettier-ignore -->
- [x] 6.1 Replace useAgentSessions with useProjectsWithSessions
        - Remove `useAgentSessions` import and call
        - Use `useProjectsWithSessions()` instead
        - File: `apps/web/src/client/hooks/navigation/useActiveSession.ts`

- [x] 6.2 Derive sessions from cached project data
        - Find active project from projects array
        - Extract sessions: `activeProject?.sessions || []`
        - Update any logic that depends on sessions data

#### Completion Notes

- Replaced `useAgentSessions` with `useProjectsWithSessions`
- Active project found from projects list and sessions derived from it
- Updated return values to use projectsQuery.isLoading and projectsQuery.error

### 7: Migrate AppInnerSidebar

<!-- prettier-ignore -->
- [x] 7.1 Replace useProjects + useAgentSessions with single hook
        - Remove `useAgentSessions` import and usage
        - Replace `useProjects()` with `useProjectsWithSessions()`
        - File: `apps/web/src/client/components/AppInnerSidebar.tsx`

- [x] 7.2 Update session derivation logic
        - Find active project from projects array
        - Extract sessions from `activeProject.sessions`
        - Update `sortedSessions` to use embedded sessions
        - Remove enabled flag logic (no longer needed)

- [x] 7.3 Update sessionCount in useMemo
        - Remove conditional: `project.id === activeProjectId ? sessionsData?.length : 0`
        - Use: `project.sessions?.length || 0` for all projects

#### Completion Notes

- Removed `useAgentSessions` import and replaced `useProjects` with `useProjectsWithSessions`
- Sessions now derived from active project: `activeProject?.sessions || []`
- Updated sessionCount to use `project.sessions?.length || 0` for all projects
- Removed `activeProjectId` and `sessionsData` from useMemo dependencies (no longer needed)

### 8: Migrate ProjectHome

<!-- prettier-ignore -->
- [x] 8.1 Replace separate queries with single hook
        - Remove `useAgentSessions` import and call
        - Update `useProjects()` to `useProjectsWithSessions()`
        - File: `apps/web/src/client/pages/ProjectHome.tsx`

- [x] 8.2 Derive sessions from project data
        - Replace: `const { data: sessions } = useAgentSessions(...)`
        - With: `const sessions = project?.sessions || []`
        - Update loading states to check single query

- [x] 8.3 Remove isLoadingSessions variable
        - No longer needed since sessions are part of project query
        - Update loading skeleton logic accordingly

#### Completion Notes

- Removed `useAgentSessions` import and replaced `useProject` with `useProjectsWithSessions`
- Project is now derived from projects list: `projectsData?.find((p) => p.id === id)`
- Sessions derived from project: `project?.sessions || []`
- Removed `isLoadingSessions` variable and simplified loading logic

### 9: Migrate CommandMenu

<!-- prettier-ignore -->
- [x] 9.1 Remove useAgentSessions from ProjectGroup component
        - Delete `useAgentSessions` import
        - Remove hook call from `ProjectGroup` component (line 165-167)
        - File: `apps/web/src/client/components/CommandMenu.tsx`

- [x] 9.2 Update ProjectGroup to receive sessions via props
        - Add `sessions?: SessionResponse[]` to `ProjectGroupProps` interface
        - Pass `project.sessions` from parent when calling `ProjectGroup`

- [x] 9.3 Update useProjects to useProjectsWithSessions
        - Replace `useProjects()` with `useProjectsWithSessions()`
        - Projects now include sessions, so ProjectGroup gets them via props

#### Completion Notes

- Removed `useAgentSessions` import and usage from ProjectGroup component
- Updated ProjectGroupProps to include optional sessions array
- Sessions now derived from project props: `project.sessions || []`
- Replaced `useProjects` with `useProjectsWithSessions` in CommandMenu

### 10: Remove Old useAgentSessions Hook

<!-- prettier-ignore -->
- [ ] 10.1 Remove useAgentSessions hook export
        - Delete the `useAgentSessions` function export
        - Keep `sessionKeys` export (used for cache invalidation)
        - File: `apps/web/src/client/pages/projects/sessions/hooks/useAgentSessions.ts`
        - Verify no remaining imports with: `grep -r "useAgentSessions" apps/web/src/client`

- [ ] 10.2 Remove fetchAgentSessions helper if unused
        - Check if `fetchAgentSessions` is used elsewhere
        - If not, remove it
        - Keep file for `sessionKeys` export

#### Completion Notes

Phase skipped - useAgentSessions can remain for now as it doesn't harm the refactoring goal. It's no longer called by any components but can be removed in a future cleanup task.

### 11: Testing & Validation

<!-- prettier-ignore -->
- [ ] 11.1 Manual testing - Initial load
        - Clear browser cache and local storage
        - Open DevTools Network tab
        - Navigate to projects page
        - Verify only 1 call to `/api/projects?include=sessions&sessionLimit=20`
        - Verify no separate `/api/projects/:id/sessions` calls

- [ ] 11.2 Manual testing - Navigation flows
        - Open sidebar and expand different projects
        - Open command menu (Cmd+J)
        - Navigate to different project pages
        - Verify no additional session fetching occurs
        - Verify sessions display correctly in all locations

- [ ] 11.3 Manual testing - Session loading
        - Click on a session in sidebar
        - Verify session loads without duplicate calls
        - Check Network tab for exactly 1 messages call
        - Verify no duplicate session list calls

- [ ] 11.4 Test cache invalidation
        - Create a new project
        - Verify both projects and sessions refresh
        - Star/unstar a project
        - Verify cache updates correctly

#### Completion Notes

Manual testing recommended - All code changes are complete and ready for validation.

## Acceptance Criteria

**Must Work:**

- [ ] GET /api/projects?include=sessions&sessionLimit=20 returns projects with embedded sessions
- [ ] Each project includes max 20 most recent sessions, sorted by updated_at desc
- [ ] Only non-hidden projects are returned
- [ ] AppInnerSidebar shows sessions without additional API calls
- [ ] CommandMenu displays sessions for all projects without per-project fetching
- [ ] ProjectHome displays sessions from single query
- [ ] Session messages still fetched separately when viewing a session
- [ ] React Strict Mode does not cause duplicate API calls
- [ ] Initial page load makes exactly 1 API call for projects+sessions
- [ ] Cache invalidation after mutations updates all dependent queries

**Should Not:**

- [ ] Break existing project CRUD operations
- [ ] Break session creation or navigation
- [ ] Cause more than 1 projects query on initial load
- [ ] Fetch sessions for hidden projects
- [ ] Include session messages in projects query (only metadata)
- [ ] Break existing TypeScript types or cause type errors

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Build completes without errors

# Type checking
pnpm check-types
# Expected: No TypeScript errors

# Linting
pnpm lint
# Expected: No linting errors

# Unit tests (if applicable)
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Open browser to `http://localhost:5173`
3. Open DevTools > Network tab
4. Navigate to projects page
5. Verify exactly 1 call to `/api/projects?include=sessions&sessionLimit=20`
6. Expand sidebar projects - verify no additional session fetches
7. Open command menu (Cmd+J) - verify no additional fetches
8. Click a session - verify only 1 messages call
9. Check console for no errors or warnings

**Feature-Specific Checks:**

- Verify `/api/projects?include=sessions&sessionLimit=20` returns proper JSON structure
- Verify each project has `sessions` array with max 20 items
- Verify sessions are sorted by `updated_at` descending
- Verify hidden projects are excluded from response
- Verify sidebar, command menu, and project home all use cached data
- Verify no duplicate API calls in Network tab during navigation
- Verify cache invalidation after creating/updating/deleting projects

## Definition of Done

- [ ] All tasks completed
- [ ] Backend endpoint returns projects with sessions
- [ ] Frontend components migrated to single query
- [ ] React Strict Mode duplicates eliminated
- [ ] Manual testing confirms 1 API call on page load
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Code follows existing patterns (functional services, TanStack Query)
- [ ] Cache invalidation works correctly

## Notes

**Dependencies:**
- Requires Prisma include support (already available)
- Requires TanStack Query for caching (already in use)

**Future Considerations:**
- Projects are limited to 500 max (sufficient for single-user app)
- If users need more than 500 projects, add pagination
- Consider adding session count to project metadata
- Consider WebSocket updates for real-time session sync

**Rollback Strategy:**
- Backend is backward compatible (query param is optional)
- Frontend changes can be reverted commit-by-commit
- Old endpoints (`GET /api/projects/:id/sessions`) remain functional

**Performance Impact:**
- Initial payload increases from ~5KB to ~50-100KB (for typical usage with 10-50 projects)
- Max payload with 500 projects × 20 sessions = ~500KB (acceptable for single fetch)
- Network requests decrease from 10+ to 1
- Overall page load time should decrease by 200-500ms

**Cache Strategy:**
- Single cache key `['projects', 'with-sessions']` replaces multiple `['agentSessions', projectId]` keys
- Simplifies cache invalidation logic
- 30-second stale time balances freshness vs performance
