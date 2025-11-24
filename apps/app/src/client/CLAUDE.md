# Client Development Guide

Frontend development guide for the agentcmd React application.

## Tech Stack

- **React 19** + **Vite** - UI and build
- **React Router** - Client routing
- **TanStack Query** - Server state
- **Zustand** - Client state
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Components

## Critical Rules

### Component Naming

✅ **PascalCase** for all components EXCEPT shadcn/ui:
- `components/ProjectCard.tsx`
- `components/Sidebar.tsx`
- `components/ui/button.tsx` (kebab-case, shadcn only)

✅ **Page components**: default export + "Page" suffix:
```typescript
export default function LoginPage() {
  // ...
}
```

❌ **DON'T**:
- kebab-case outside `components/ui/`
- Named exports for page components
- Missing "Page" suffix for route-mounted components

### React State Rules

**useEffect**: Primitives only in dependencies (objects cause infinite loops)
**Zustand**: Immutable updates only (no mutations)

**See:** Root CLAUDE.md for detailed examples and rules

## Feature Organization

Co-locate related code by feature:

```
pages/projects/sessions/    # Feature
├── components/             # Session-specific
├── hooks/                  # Session-specific
├── stores/                 # Session-specific
├── types/                  # Session-specific
└── ProjectSession.tsx
```

**Example:** `apps/app/src/client/pages/projects/sessions/`

## Utils

Scan first: `shared/utils/` → `client/utils/` (one export per file). Pure logic used 2+ places → extract to client utils.

## State Management

### Zustand (Client State)

UI state, auth, navigation with optional persistence.

**Example:** `apps/app/src/client/stores/authStore.ts`

### TanStack Query (Server State)

Data fetching with caching and invalidation.

**See:** `.agent/docs/frontend-patterns.md` for detailed patterns

## API Calls

**CRITICAL**: Always use the centralized API client for all HTTP requests.

### Centralized API Client

✅ **DO** - Use `api` from `@/client/utils/api.ts`:

```typescript
import { api } from "@/client/utils/api";

// GET request
const data = await api.get<{ data: Session[] }>("/api/sessions");

// POST request
const result = await api.post<{ data: Session }>("/api/sessions", {
  name: "New Session"
});

// PATCH request
const updated = await api.patch<{ data: Session }>("/api/sessions/123", {
  name: "Updated"
});

// DELETE request
await api.delete("/api/sessions/123");
```

❌ **DON'T** - Manual fetch with localStorage tokens:

```typescript
// Never do this - auth header injection missing, 401 handling missing
const response = await fetch("/api/sessions", {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
});
```

**Why:**
- Automatic auth header injection (no manual token handling)
- Global 401 error handling (auto-redirect to login)
- Consistent error handling across all API calls
- Type-safe request/response types

**Location:** `apps/app/src/client/utils/api.ts`

## WebSocket Client

Feature-level hooks for real-time updates. Subscribe to channels (colon notation), listen for events (dot notation).

**Example:** `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
**See:** `.agent/docs/websocket-architecture.md` for comprehensive patterns

## Component Patterns

- **Loading**: Use Skeleton components
- **Errors**: Use `sonner` toast
- **Conditional**: Early returns preferred
- **API**: Type-safe fetch with shared types from `@/shared/types`

**See:** `.agent/docs/frontend-patterns.md` for comprehensive component patterns

## Key Examples

**Page Components:**
- `apps/app/src/client/pages/LoginPage.tsx`
- `apps/app/src/client/pages/ProjectHomePage.tsx`

**Zustand Store:**
- `apps/app/src/client/stores/authStore.ts`

**Feature Organization:**
- `apps/app/src/client/pages/projects/sessions/`

**WebSocket Hook:**
- `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

## Detailed Patterns

See `.agent/docs/frontend-patterns.md` for comprehensive guide:
- React hooks patterns
- Custom hooks
- Routing
- Environment variables
- All component patterns

## Related Docs

- `.agent/docs/frontend-patterns.md` - Comprehensive frontend guide
- `.agent/docs/websocket-architecture.md` - WebSocket patterns
- Root `CLAUDE.md` - Critical React rules
