# Hello World Example

**Status**: draft
**Type**: issue
**Created**: 2025-11-22
**Package**: apps/app
**Total Complexity**: 12 points
**Tasks**: 4
**Avg Complexity**: 3.0/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 4        |
| Total Points    | 12       |
| Avg Complexity  | 3.0/10   |
| Max Task        | 4/10     |

## Overview

Add a simple "Hello World" example to demonstrate basic API endpoint and frontend integration patterns. This serves as a minimal reference implementation for new developers joining the project.

## User Story

As a developer
I want a simple "Hello World" example
So that I can understand the basic full-stack integration patterns

## Technical Approach

Create a minimal example showing the standard pattern for API routes and frontend pages in this monorepo:

**Key Points**:
- Follow CRUD gold standard for backend service
- Use Fastify route pattern with proper typing
- Create simple frontend page using React 19 conventions
- Demonstrate @/ import aliases and no file extensions

## Files to Create/Modify

### New Files (3)

1. `apps/app/src/server/domain/hello/services/getHelloMessage.ts` - Service returning hello message
2. `apps/app/src/server/routes/hello.ts` - Hello endpoint route
3. `apps/app/src/client/pages/HelloWorldPage.tsx` - Simple hello world page

### Modified Files (2)

1. `apps/app/src/server/app.ts` - Register hello route
2. `apps/app/src/client/Router.tsx` - Add hello world route

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] [task-1] [3/10] Create hello service with message generation
  - Create domain service following CRUD naming
  - File: `apps/app/src/server/domain/hello/services/getHelloMessage.ts`
  - Export single function `getHelloMessage()`
  - Return simple object with message property

- [ ] [task-2] [4/10] Add Fastify route for hello endpoint
  - Follow backend route patterns from `.agent/docs/backend-patterns.md`
  - File: `apps/app/src/server/routes/hello.ts`
  - Create GET `/api/hello` endpoint
  - Use proper TypeScript typing for request/reply
  - Call `getHelloMessage()` service

- [ ] [task-3] [3/10] Register route in server app
  - File: `apps/app/src/server/app.ts`
  - Import and register hello route
  - Follow existing route registration pattern

- [ ] [task-4] [2/10] Create simple frontend page component
  - File: `apps/app/src/client/pages/HelloWorldPage.tsx`
  - Use TanStack Query to fetch from `/api/hello`
  - Display message in simple UI
  - Add route to `apps/app/src/client/Router.tsx`

## Testing Strategy

### Unit Tests

**Not required for this example** - Manual verification sufficient

### Integration Tests

Manual testing via browser and API calls

## Success Criteria

- [ ] Backend endpoint returns hello message at `/api/hello`
- [ ] Frontend page displays message from API
- [ ] No TypeScript errors
- [ ] Follows monorepo conventions (imports, file structure)
- [ ] Build completes successfully

## Validation

**Automated:**

```bash
# Build
pnpm build
# Expected: No errors

# Type check
pnpm check-types
# Expected: no errors
```

**Manual:**

1. Start app: `pnpm dev`
2. Navigate to: `http://localhost:5173/hello`
3. Verify: Page displays "Hello World" message from API
4. Test: API directly at `http://localhost:3456/api/hello`
5. Verify: Returns JSON with message property

## Implementation Notes

### Assumptions

- Using existing project structure and patterns
- No authentication required for hello endpoint
- Simple GET endpoint without parameters
- Minimal UI without styling requirements

### Reference Patterns

- Backend services: `apps/app/src/server/domain/workflow/services/definitions/`
- Routes: `apps/app/src/server/routes/projects.ts`
- Frontend pages: `apps/app/src/client/pages/ProjectsPage.tsx`

## Dependencies

- No new dependencies

## References

- `.agent/docs/backend-patterns.md` - Backend service patterns
- `.agent/docs/frontend-patterns.md` - React component patterns
- `CLAUDE.md` - Import conventions and code organization
