# ABC Example Feature

**Status**: draft
**Created**: 2025-11-23
**Package**: apps/app
**Total Complexity**: 8 points
**Phases**: 2
**Tasks**: 4
**Overall Avg Complexity**: 4.0/10

## Complexity Breakdown

| Phase           | Tasks   | Total Points | Avg Complexity | Max Task   |
| --------------- | ------- | ------------ | -------------- | ---------- |
| Phase 1: Core Logic | 2     | 5          | 2.5/10       | 3/10     |
| Phase 2: Integration | 2     | 3          | 1.5/10       | 2/10     |
| **Total**       | **4** | **8**      | **4.0/10**   | **3/10** |

## Overview

ABC is a minimal full-stack integration example demonstrating core architectural patterns in the monorepo. It showcases backend domain service, API route, frontend page component, and proper route registration following project conventions.

## User Story

As a developer
I want a simple reference implementation
So that I can understand the standard patterns for building full-stack features

## Technical Approach

Create minimal backend service returning static data, expose via REST API, consume from frontend page using TanStack Query. Follow domain-driven architecture patterns with proper TypeScript typing and import conventions.

## Key Design Decisions

1. **Domain-Driven Structure**: Place backend logic in `domain/abc/` following existing patterns
2. **Single Service Pattern**: One function per file (`getAbcData.ts`)
3. **Centralized API Client**: Use existing `@/client/utils/api.ts` for HTTP calls

## Architecture

### File Structure

```
apps/app/src/
├── server/
│   ├── domain/abc/
│   │   └── services/
│   │       └── getAbcData.ts
│   └── routes/
│       └── abc.ts
└── client/
    └── pages/
        └── AbcPage.tsx
```

### Integration Points

**Backend**:
- `apps/app/src/server/domain/abc/services/getAbcData.ts` - Core service logic
- `apps/app/src/server/routes/abc.ts` - API route handler
- `apps/app/src/server/routes.ts` - Route registration

**Frontend**:
- `apps/app/src/client/pages/AbcPage.tsx` - Page component
- `apps/app/src/client/router.tsx` - Route configuration

## Implementation Details

### 1. Backend Service

Simple service returning static example data with proper TypeScript typing.

**Key Points**:
- Located in domain services directory
- Returns typed object
- No database interaction required
- File name matches export name

### 2. API Route

REST endpoint exposing service via GET request.

**Key Points**:
- Standard Fastify route handler
- Delegates to domain service
- Returns JSON response
- No authentication required

### 3. Frontend Page

React component consuming API data via TanStack Query.

**Key Points**:
- Uses centralized API client
- TanStack Query for data fetching
- Simple display of fetched data
- Registered in React Router

## Files to Create/Modify

### New Files (3)

1. `apps/app/src/server/domain/abc/services/getAbcData.ts` - Core service logic
2. `apps/app/src/server/routes/abc.ts` - API route handler
3. `apps/app/src/client/pages/AbcPage.tsx` - Frontend page component

### Modified Files (2)

1. `apps/app/src/server/routes.ts` - Register ABC routes
2. `apps/app/src/client/router.tsx` - Add ABC page route

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Core Logic

**Phase Complexity**: 5 points (avg 2.5/10)

- [ ] 1.1 [2/10] Create domain service `getAbcData`
  - Implement function returning static example data
  - File: `apps/app/src/server/domain/abc/services/getAbcData.ts`
  - Export interface for return type
  - Use proper TypeScript typing

- [ ] 1.2 [3/10] Create API route handler
  - Implement GET `/api/abc` endpoint
  - File: `apps/app/src/server/routes/abc.ts`
  - Import and call `getAbcData` service
  - Return JSON response
  - Add proper error handling

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Integration

**Phase Complexity**: 3 points (avg 1.5/10)

- [ ] 2.1 [1/10] Register ABC routes in server
  - Add route registration to routes index
  - File: `apps/app/src/server/routes.ts`
  - Follow existing pattern with `fastify.register()`

- [ ] 2.2 [2/10] Create frontend page component
  - Implement AbcPage component
  - File: `apps/app/src/client/pages/AbcPage.tsx`
  - Use TanStack Query to fetch from `/api/abc`
  - Display fetched data
  - Register route in `router.tsx` at `/abc`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`apps/app/src/server/domain/abc/services/getAbcData.test.ts`** - Service logic:

```typescript
describe('getAbcData', () => {
  it('should return example data structure', () => {
    const result = getAbcData();
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('timestamp');
  });
});
```

### Integration Tests

Test API endpoint returns expected data:

```typescript
describe('GET /api/abc', () => {
  it('should return 200 with data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/abc'
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('message');
  });
});
```

### E2E Tests

**`apps/app/tests/e2e/abc-page.test.ts`** - Frontend integration:

- Navigate to `/abc`
- Verify data loads and displays
- Check no console errors

## Success Criteria

- [ ] Service returns typed example data
- [ ] API endpoint responds at GET `/api/abc`
- [ ] Frontend page renders at `/abc`
- [ ] Data flows from backend to frontend
- [ ] No TypeScript errors
- [ ] No console warnings or errors
- [ ] Follows project import conventions (@/ aliases, no extensions)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Build verification
pnpm --filter app build
# Expected: Successful build

# Unit tests (if added)
pnpm --filter app test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev` (from `apps/app/`)
2. Navigate to: `http://localhost:5173/abc`
3. Verify: Page loads and displays data from API
4. Test edge cases: Refresh page, check network tab shows successful API call
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- API endpoint responds: `curl http://localhost:3456/api/abc`
- Data structure matches expected interface
- Frontend renders data correctly
- Route navigation works from other pages

## Implementation Notes

### 1. Import Conventions Critical

Must use `@/` path aliases and no file extensions per CLAUDE.md rules. Example:

```typescript
import { getAbcData } from "@/server/domain/abc/services/getAbcData";
```

### 2. File Naming Pattern

File name must match export name: `getAbcData.ts` exports `getAbcData` function.

### 3. One Export Per File

Each service file exports single function. Shared types go in `.types.ts` files.

## Dependencies

- No new dependencies required
- Uses existing Fastify, TanStack Query, React Router

## References

- Similar pattern: `.agent/specs/done/2511221344-hello-world/spec.md`
- Backend patterns: `.agent/docs/backend-patterns.md`
- Frontend patterns: `.agent/docs/frontend-patterns.md`
- Import rules: `CLAUDE.md` (root)

## Next Steps

1. Create backend service in `domain/abc/services/`
2. Create API route handler
3. Register route in server routes index
4. Create frontend page component
5. Register page route in React Router
6. Test end-to-end data flow
