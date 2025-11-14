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

### useEffect Dependencies

✅ **Primitives only** - avoid infinite loops:
```typescript
const { userId, projectId } = project;
useEffect(() => {
  fetchData(userId, projectId);
}, [userId, projectId]);
```

❌ **DON'T** use objects/arrays:
```typescript
useEffect(() => {
  fetchData(project);
}, [project]); // Infinite loop!
```

### Zustand Immutability

✅ **Immutable updates** only:
```typescript
set((state) => ({
  messages: [...state.messages, newMessage],
}));
```

❌ **DON'T** mutate:
```typescript
set((state) => {
  state.messages.push(newMessage);
  return { messages: state.messages };
});
```

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

## State Management

### Zustand (Client State)

For UI state, auth, navigation:

```typescript
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        // ...
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    { name: "auth-storage" }
  )
);
```

**Example:** `apps/app/src/client/stores/authStore.ts`

### TanStack Query (Server State)

For data fetching, caching:

```typescript
export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

## WebSocket Client

Feature-level WebSocket hooks for real-time updates:

```typescript
export function useSessionWebSocket(sessionId: string) {
  const { socket, isConnected } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit("subscribe", `session:${sessionId}`);

    socket.on("session.stream_output", (data) => {
      setMessages((prev) => [...prev, data.content]);
    });

    return () => {
      socket.off("session.stream_output");
      socket.emit("unsubscribe", `session:${sessionId}`);
    };
  }, [socket, isConnected, sessionId]);

  return { messages, isConnected };
}
```

**Example:** `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

## Component Patterns

### Loading States

```typescript
import { Skeleton } from "@/client/components/ui/skeleton";

if (isLoading) {
  return <Skeleton className="h-8 w-64" />;
}
```

### Error Handling

```typescript
import { toast } from "sonner";

try {
  await createProject({ name, path });
  toast.success("Project created");
} catch (error) {
  toast.error(error instanceof Error ? error.message : "Failed");
}
```

### Conditional Rendering

Use early returns:
```typescript
if (projects.length === 0) {
  return <EmptyState message="No projects yet" />;
}

return <ProjectList projects={projects} />;
```

## API Integration

Type-safe fetch with shared types:

```typescript
import type { Project } from "@/shared/types";

async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch");

  return response.json();
}
```

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
