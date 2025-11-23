# AAAA Feature

**Status**: draft
**Created**: 2025-11-23
**Package**: apps/app
**Total Complexity**: 8 points
**Phases**: 2
**Tasks**: 4
**Overall Avg Complexity**: 2.0/10

## Complexity Breakdown

| Phase                | Tasks | Total Points | Avg Complexity | Max Task |
| -------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Core Logic  | 2     | 4            | 2.0/10         | 2/10     |
| Phase 2: Integration | 2     | 4            | 2.0/10         | 2/10     |
| **Total**            | **4** | **8**        | **2.0/10**     | **2/10** |

## Overview

Implements a simple AAAA feature to demonstrate basic full-stack integration pattern following monorepo conventions. This serves as a minimal example for backend service, API route, and frontend page integration.

## User Story

As a developer
I want a simple AAAA feature implementation
So that I can understand the standard full-stack integration patterns in this codebase

## Technical Approach

Create minimal backend service and frontend page following established patterns:
- Domain service in `domain/aaaa/services/`
- Fastify route at `/api/aaaa`
- React page component with TanStack Query
- Follow CRUD gold standard naming conventions

## Key Design Decisions

1. **Domain-Driven Structure**: Place service in `domain/aaaa/services/` following one-function-per-file pattern
2. **Route Pattern**: Use thin Fastify route handler delegating to domain service
3. **Frontend Integration**: Use TanStack Query for API calls with proper typing

## Architecture

### File Structure

```
apps/app/
├── src/
│   ├── server/
│   │   ├── domain/
│   │   │   └── aaaa/
│   │   │       └── services/
│   │   │           └── getAaaaData.ts
│   │   └── routes/
│   │       └── aaaa.ts
│   └── client/
│       └── pages/
│           └── AaaaPage.tsx
```

### Integration Points

**Backend**:
- `apps/app/src/server/domain/aaaa/services/getAaaaData.ts` - Domain service
- `apps/app/src/server/routes/aaaa.ts` - API route
- `apps/app/src/server/app.ts` - Route registration

**Frontend**:
- `apps/app/src/client/pages/AaaaPage.tsx` - Page component
- `apps/app/src/client/Router.tsx` - Route configuration

## Implementation Details

### 1. Domain Service

Pure function returning AAAA data following CRUD naming pattern.

**Key Points**:
- One function per file
- File name matches function name
- No external dependencies needed
- Returns typed object

### 2. API Route

Thin Fastify route handler at `/api/aaaa` endpoint.

**Key Points**:
- Delegates to domain service
- Proper TypeScript typing
- Minimal logic (< 20 lines)
- Follows backend-patterns.md conventions

### 3. Frontend Page

React component using TanStack Query for data fetching.

**Key Points**:
- Uses @/ import alias
- TanStack Query for API call
- Simple UI rendering data
- Follows frontend-patterns.md conventions

## Files to Create/Modify

### New Files (3)

1. `apps/app/src/server/domain/aaaa/services/getAaaaData.ts` - Domain service function
2. `apps/app/src/server/routes/aaaa.ts` - API route handler
3. `apps/app/src/client/pages/AaaaPage.tsx` - Frontend page component

### Modified Files (2)

1. `apps/app/src/server/app.ts` - Register aaaa route
2. `apps/app/src/client/Router.tsx` - Add aaaa page route

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Core Logic

**Phase Complexity**: 4 points (avg 2.0/10)

- [ ] 1.1 [2/10] Create domain service function
  - Create pure function `getAaaaData()` returning simple data object
  - File: `apps/app/src/server/domain/aaaa/services/getAaaaData.ts`
  - Export single function with TypeScript types
  - Return object with `message` and `timestamp` properties

- [ ] 1.2 [2/10] Create API route handler
  - Create Fastify route at GET `/api/aaaa`
  - File: `apps/app/src/server/routes/aaaa.ts`
  - Delegate to `getAaaaData()` service
  - Use proper request/reply typing

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Integration

**Phase Complexity**: 4 points (avg 2.0/10)

- [ ] 2.1 [2/10] Register route in server app
  - Import and register aaaa route in server
  - File: `apps/app/src/server/app.ts`
  - Follow existing route registration pattern

- [ ] 2.2 [2/10] Create frontend page component
  - Create React page component using TanStack Query
  - File: `apps/app/src/client/pages/AaaaPage.tsx`
  - Fetch from `/api/aaaa` endpoint
  - Display data in simple UI
  - Add route to `apps/app/src/client/Router.tsx` at `/aaaa` path

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

Not required - manual verification sufficient for this minimal example.

### Integration Tests

Manual browser testing and direct API calls.

## Success Criteria

- [ ] Backend endpoint returns data at `/api/aaaa`
- [ ] Frontend page displays data from API at `/aaaa`
- [ ] TypeScript compilation succeeds
- [ ] Follows import conventions (@/ alias, no file extensions)
- [ ] One function per file pattern maintained
- [ ] Build completes without errors

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Build succeeds without errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm --filter app check
# Expected: No lint errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/aaaa`
3. Verify: Page displays AAAA data from API
4. Test API directly: `curl http://localhost:3456/api/aaaa`
5. Verify: Returns JSON with message and timestamp
6. Check console: No errors or warnings

**Feature-Specific Checks:**

- API returns proper JSON structure
- Frontend correctly renders API response
- Route is properly registered in both server and client

## Implementation Notes

### 1. Minimal Example Pattern

This follows the same minimal pattern as hello-world example but with AAAA naming. Keep implementation simple and focused on demonstrating integration patterns.

### 2. No Authentication

No authentication required for this example endpoint - focuses purely on integration pattern.

## Dependencies

- No new dependencies required

## References

- `.agent/docs/backend-patterns.md` - Backend service and route patterns
- `.agent/docs/frontend-patterns.md` - React component patterns
- `CLAUDE.md` - Import conventions and code organization
- `.agent/specs/done/2511221344-hello-world/spec.md` - Similar minimal example

## Next Steps

1. Create domain service function in `domain/aaaa/services/`
2. Create API route handler in `routes/aaaa.ts`
3. Register route in server app
4. Create frontend page component
5. Add route to Router
6. Test full integration
