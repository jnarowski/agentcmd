# Frontend Patterns

Comprehensive guide to frontend development patterns in the agentcmd app.

## Tech Stack

- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library

## Component Naming

### PascalCase (Default)

All components use PascalCase EXCEPT shadcn/ui components.

```
client/
├── components/
│   ├── Sidebar.tsx           # ✅ PascalCase
│   ├── ProjectCard.tsx       # ✅ PascalCase
│   └── ui/
│       ├── button.tsx        # ✅ kebab-case (shadcn only)
│       └── dialog.tsx        # ✅ kebab-case (shadcn only)
└── pages/
    └── LoginPage.tsx         # ✅ PascalCase + "Page" suffix
```

✅ DO:
- PascalCase for all components
- kebab-case only for `components/ui/` (shadcn)
- Page components: default export + "Page" suffix

❌ DON'T:
- kebab-case outside `components/ui/`
- camelCase for components
- Named exports for page components

## Page Components

### Default Export with "Page" Suffix

Page components mounted by React Router must use default export and "Page" suffix.

**Pattern:**
```typescript
// ✅ DO - apps/app/src/client/pages/LoginPage.tsx
export default function LoginPage() {
  useDocumentTitle("Login");

  return (
    <div>
      {/* page content */}
    </div>
  );
}

// ❌ DON'T
export function Login() { } // Missing "Page" suffix
export { LoginPage };       // Not default export
```

**Best Practices:**
- Default export for route-mounted components
- "Page" suffix distinguishes from regular components
- Use `useDocumentTitle` for page titles
- Handle loading/error states

**Example Files:**
- `apps/app/src/client/pages/LoginPage.tsx`
- `apps/app/src/client/pages/ProjectHomePage.tsx`
- `apps/app/src/client/pages/ProjectsPage.tsx`

## Feature-Based Organization

### Co-locate Related Code

Organize code by feature, not by type. All related code lives together.

**Structure:**
```
pages/projects/sessions/        # Feature: Chat sessions
├── components/                 # Session-specific components
│   ├── SessionList.tsx
│   ├── ChatInterface.tsx
│   └── MessageBubble.tsx
├── hooks/                      # Session-specific hooks
│   ├── useSessionWebSocket.ts
│   ├── useAgentSessions.ts
│   └── usePromptInputState.ts
├── stores/                     # Session-specific state
│   └── sessionUIStore.ts
├── types/                      # Session-specific types
│   └── session.types.ts
└── ProjectSession.tsx          # Feature page component
```

**Benefits:**
- Easy to find related code
- Clear boundaries
- Easy to delete features
- Scalable organization

✅ DO:
- Group by feature
- Co-locate components, hooks, stores, types
- Use feature-specific naming

❌ DON'T:
- Organize by type (all components/, all hooks/)
- Share state between unrelated features
- Create deep nesting (max 3-4 levels)

**Example:** `apps/app/src/client/pages/projects/sessions/`

## State Management

### Zustand Stores

Use Zustand for client-side state (UI state, auth, navigation).

**Pattern:**
```typescript
// apps/app/src/client/stores/authStore.ts

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // State
      token: null,
      user: null,
      isAuthenticated: false,

      // Actions
      login: async (email, password) => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        // ✅ Immutable update
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
        });
      },

      logout: () => {
        // ✅ Immutable update
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },

      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
```

**Best Practices:**
- Separate state and actions in interface
- Immutable updates only
- Persist middleware for localStorage
- Error handling with toasts
- JSDoc for all methods

✅ DO - Immutable Updates:
```typescript
// Add to array
set((state) => ({
  messages: [...state.messages, newMessage],
}));

// Update object
set((state) => ({
  user: { ...state.user, name: newName },
}));

// Remove from array
set((state) => ({
  messages: state.messages.filter(m => m.id !== id),
}));
```

❌ DON'T - Mutations:
```typescript
// ❌ Mutating array
set((state) => {
  state.messages.push(newMessage);
  return { messages: state.messages };
});

// ❌ Mutating object
set((state) => {
  state.user.name = newName;
  return { user: state.user };
});
```

**Example:** `apps/app/src/client/stores/authStore.ts`

### TanStack Query

Use TanStack Query for server state (data fetching, caching, mutations).

**Pattern:**
```typescript
// hooks/useProject.ts

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Usage in component
function ProjectHomePage() {
  const { projectId } = useParams();
  const { data: project, isLoading, error } = useProject(projectId!);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{project.name}</div>;
}
```

**Best Practices:**
- One hook per API endpoint
- Consistent query keys
- Error handling
- Loading states
- Stale time for caching

✅ DO:
- Use query hooks in components
- Handle loading/error states
- Cache with staleTime
- Invalidate queries after mutations

❌ DON'T:
- Fetch in useEffect
- Store server data in Zustand
- Forget error handling
- Skip loading states

**Example:** `apps/app/src/client/pages/projects/hooks/useProject.ts`

## React Hooks

### useEffect Dependencies

Only use primitives in dependency arrays to avoid infinite loops.

**Pattern:**
```typescript
// ✅ DO - Primitives only
useEffect(() => {
  fetchData(userId, projectId);
}, [userId, projectId]);

// ✅ DO - Omit stable functions with eslint-disable
useEffect(() => {
  fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [id]);

// ❌ DON'T - Objects cause infinite loops
useEffect(() => {
  fetchData(user, project);
}, [user, project]);

// ❌ DON'T - Arrays cause infinite loops
useEffect(() => {
  processItems(items);
}, [items]);
```

**Best Practices:**
- Extract primitive values from objects
- Use eslint-disable for stable functions
- Consider useMemo for derived values
- Use useCallback for stable functions

**Common Pattern:**
```typescript
// Extract primitives
const { userId, projectId } = project;

useEffect(() => {
  // Use primitives in closure
  loadData(userId, projectId);
}, [userId, projectId]);
```

### Custom Hooks

Create custom hooks for reusable logic.

**Pattern:**
```typescript
// hooks/useDocumentTitle.ts

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | AgentCmd`;

    return () => {
      document.title = "AgentCmd";
    };
  }, [title]);
}

// Usage
function LoginPage() {
  useDocumentTitle("Login");
  // ...
}
```

**Example Files:**
- `apps/app/src/client/hooks/useDocumentTitle.ts`
- `apps/app/src/client/hooks/useDebugMode.ts`
- `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

## WebSocket Client

### Feature-Level WebSocket Hooks

Each feature implements its own WebSocket hook for real-time updates.

**Pattern:**
```typescript
// pages/projects/sessions/hooks/useSessionWebSocket.ts

export function useSessionWebSocket(sessionId: string) {
  const { socket, isConnected } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to channel
    socket.emit("subscribe", `session:${sessionId}`);

    // Handle events
    const handleStreamOutput = (data: StreamOutputData) => {
      setMessages((prev) => [...prev, data.content]);
    };

    socket.on("session.stream_output", handleStreamOutput);

    // Cleanup
    return () => {
      socket.off("session.stream_output", handleStreamOutput);
      socket.emit("unsubscribe", `session:${sessionId}`);
    };
  }, [socket, isConnected, sessionId]);

  return { messages, isConnected };
}
```

**Best Practices:**
- Subscribe to channels on mount
- Unsubscribe on unmount
- Handle events with immutable updates
- Check connection status
- Type-safe event data

✅ DO:
- Channel naming: `domain:id` (session:123)
- Event naming: `domain.action` (session.stream_output)
- Immutable state updates
- Cleanup in useEffect return

❌ DON'T:
- Forget to unsubscribe
- Mutate state
- Mix naming conventions
- Skip connection checks

**Example:** `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

**See Also:** `.agent/docs/websocket-architecture.md`

## API Integration

### Type-Safe Fetch

Use shared types for type-safe API responses.

**Pattern:**
```typescript
// ✅ DO - Type-safe
import type { Project } from "@/shared/types";

async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch");
  }

  return response.json();
}

// ❌ DON'T - Untyped
async function fetchProject(id: string) {
  const response = await fetch(`/api/projects/${id}`);
  return response.json(); // any
}
```

**Best Practices:**
- Import types from `@/shared/types`
- Handle errors with try/catch
- Show error toasts
- Loading states in UI

### Error Handling

Display user-friendly error messages.

**Pattern:**
```typescript
import { toast } from "sonner";

try {
  await createProject({ name, path });
  toast.success("Project created");
} catch (error) {
  toast.error(
    error instanceof Error
      ? error.message
      : "Failed to create project"
  );
}
```

## Component Patterns

### Loading States

Use Skeleton components for loading states.

**Pattern:**
```typescript
import { Skeleton } from "@/client/components/ui/skeleton";

function ProjectHomePage() {
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <div>{project.name}</div>;
}
```

### Error Boundaries

Wrap components with error boundaries for error handling.

**Pattern:**
```typescript
<ErrorBoundary fallback={<ErrorMessage />}>
  <ProjectHomePage />
</ErrorBoundary>
```

### Conditional Rendering

Use early returns for cleaner code.

**Pattern:**
```typescript
// ✅ DO - Early returns
function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return <EmptyState message="No projects yet" />;
  }

  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

// ❌ DON'T - Nested ternaries
function ProjectList({ projects }: Props) {
  return projects.length === 0 ? (
    <EmptyState message="No projects yet" />
  ) : (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

## Routing

### React Router Patterns

Use hooks for navigation and params.

**Pattern:**
```typescript
import { useNavigate, useParams } from "react-router";

function ProjectHomePage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const handleBack = () => {
    navigate("/projects");
  };

  return <div>Project {projectId}</div>;
}
```

**Hooks:**
- `useNavigate()` - Programmatic navigation
- `useParams()` - Route parameters
- `useSearchParams()` - Query parameters
- `useLocation()` - Current location

## Environment Variables

### Vite Environment Variables

Access environment variables with `import.meta.env`.

**Pattern:**
```typescript
// ✅ DO
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;

// ❌ DON'T
const apiUrl = process.env.VITE_API_URL; // Doesn't work in Vite
```

**Convention:**
- Prefix with `VITE_` for public variables
- Access via `import.meta.env`
- Type in `vite-env.d.ts`

## Quick Reference

**File Structure:**
```
client/
├── components/         # Shared components
│   ├── ui/             # shadcn/ui (kebab-case)
│   └── *               # Custom (PascalCase)
├── pages/              # Feature-based
│   ├── auth/
│   └── projects/
│       ├── sessions/   # Feature
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── stores/
│       │   └── types/
│       └── *Page.tsx
├── stores/             # Global Zustand stores
├── hooks/              # Global hooks
└── utils/              # Utilities
```

**Key Patterns:**
- Page components: default export + "Page" suffix
- State management: Zustand (client) + TanStack Query (server)
- Feature organization: co-locate related code
- Immutable updates: always use spread operators
- useEffect deps: primitives only

**Key Files:**
- Page: `apps/app/src/client/pages/LoginPage.tsx`
- Store: `apps/app/src/client/stores/authStore.ts`
- Hook: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
- Feature: `apps/app/src/client/pages/projects/sessions/`

**Related Docs:**
- `.agent/docs/websocket-architecture.md` - WebSocket patterns
- Root `CLAUDE.md` - Critical React rules
