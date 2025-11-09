# React Query Patterns

Standard patterns for TanStack Query usage across the codebase.

## Core Principles

1. **Feature-based query keys** - Co-locate keys with hooks per domain
2. **Minimal config** - Use global defaults, avoid overrides
3. **WebSocket for real-time** - No polling with `refetchInterval`
4. **Forms invalidate only** - No optimistic updates for mutations
5. **Consistent error handling** - Shared `handleMutationError` utility

## Pattern 1: Query Keys

Feature-based factories, co-located with hooks. Hierarchical for CRUD, flat for operations.

### Hierarchical (CRUD resources)

```typescript
// pages/projects/workflows/hooks/queryKeys.ts
export const workflowKeys = {
  all: ['workflows'] as const,
  definitions: () => [...workflowKeys.all, 'definitions'] as const,
  definitionsList: (projectId: string, status?: string) =>
    [...workflowKeys.definitions(), projectId, status] as const,
  definition: (id: string) => [...workflowKeys.definitions(), id] as const,
  runs: () => [...workflowKeys.all, 'runs'] as const,
  runsList: (projectId: string, status?: string, search?: string, definitionId?: string) =>
    [...workflowKeys.runs(), projectId, status, search, definitionId] as const,
  run: (id: string) => [...workflowKeys.runs(), id] as const,
};
```

**Usage:**
```typescript
queryKey: workflowKeys.run(runId)
invalidateQueries({ queryKey: workflowKeys.runs() }) // All runs
invalidateQueries({ queryKey: workflowKeys.runsList(projectId) }) // Project runs
```

### Flat (diverse operations)

```typescript
// pages/projects/git/hooks/queryKeys.ts
export const gitKeys = {
  all: ['git'] as const,
  status: (path: string) => [...gitKeys.all, 'status', path] as const,
  diff: (path: string) => [...gitKeys.all, 'diff', path] as const,
  branches: (path: string) => [...gitKeys.all, 'branches', path] as const,
};
```

**Key rules:**
- All keys extend from base `all` key
- Use `as const` for type safety
- Only primitives in keys (no objects/arrays)

## Pattern 2: List Queries

No config overrides. Only use `enabled` when needed.

```typescript
export function useWorkflowDefinitions(projectId: string, status?: string) {
  return useQuery({
    queryKey: workflowKeys.definitionsList(projectId, status),
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}/workflows`, {
        params: { status },
      });
      return res.data.data;
    },
  });
}
```

**With conditional fetch:**
```typescript
export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: fetchProjects,
    enabled: !!user, // Only when authenticated
  });
}
```

## Pattern 3: Detail Queries

Same as lists - minimal config.

```typescript
export function useWorkflowRun(runId: string) {
  return useQuery({
    queryKey: workflowKeys.run(runId),
    queryFn: async () => {
      const res = await apiClient.get(`/api/workflow-runs/${runId}`);
      return res.data.data;
    },
  });
}
```

## Pattern 4: CREATE Mutations

Invalidate parent list only.

```typescript
export function useCreateWorkflowRun() {
  const queryClient = useQueryClient();
  const { projectId } = useCurrentProject();

  return useMutation({
    mutationFn: async (data: CreateRunData) => {
      const res = await apiClient.post('/api/workflow-runs', data);
      return res.data.data;
    },
    onSuccess: () => {
      // Invalidate list only
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runs()
      });
    },
    onError: (error) => handleMutationError(error, "creating workflow run"),
  });
}
```

## Pattern 5: UPDATE Mutations

Invalidate detail + parent list.

```typescript
export function useUpdateWorkflowRun(runId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRunData) => {
      const res = await apiClient.patch(`/api/workflow-runs/${runId}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      // Invalidate detail
      queryClient.invalidateQueries({
        queryKey: workflowKeys.run(runId)
      });
      // Invalidate parent list
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runs()
      });
    },
    onError: (error) => handleMutationError(error, "updating workflow run"),
  });
}
```

## Pattern 6: DELETE Mutations

Invalidate detail + parent list (same as UPDATE).

```typescript
export function useDeleteWorkflowRun(runId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/workflow-runs/${runId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.run(runId)
      });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runs()
      });
    },
    onError: (error) => handleMutationError(error, "deleting workflow run"),
  });
}
```

## Pattern 7: WebSocket Updates

`setQueryData` for detail (instant) + `invalidateQueries` for list (eventual consistency).

```typescript
export function useWorkflowWebSocket(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectWebSocket();

    socket.on('workflow:run:updated', (event) => {
      // 1. Instant detail update
      queryClient.setQueryData(
        workflowKeys.run(event.run_id),
        event.data
      );

      // 2. Invalidate parent list (refetches once)
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runs()
      });
    });

    return () => socket.disconnect();
  }, [projectId]);
}
```

**Key points:**
- No custom debounce (direct invalidation)
- No polling backup (WebSocket is sufficient)
- Works for detail pages and sidebar lists

## Pattern 8: Error Handling

Shared `handleMutationError` for all mutations.

```typescript
import { handleMutationError } from "@/client/utils/handleMutationError";

useMutation({
  mutationFn: createWorkflow,
  onError: (error) => handleMutationError(error, "creating workflow"),
});
```

**Context messages:**
- Use gerund form: "creating", "updating", "deleting"
- Keep brief and specific
- Will display as: "Error creating workflow: {error message}"

## Pattern 9: Global Config

Set once in `query-client.ts`, avoid per-query overrides.

```typescript
// utils/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**When to override:**
- `enabled` - Conditional fetching
- `refetchInterval` - NEVER (use WebSocket)
- `staleTime` - NEVER (use global default)

## Anti-Patterns

### ❌ Don't: Inline query keys

```typescript
// Bad
useQuery({
  queryKey: ['workflows', 'runs', projectId],
  // ...
});
```

### ✅ Do: Use factory

```typescript
// Good
useQuery({
  queryKey: workflowKeys.runsList(projectId),
  // ...
});
```

### ❌ Don't: Objects in query keys

```typescript
// Bad - causes cache misses
queryKey: ['runs', filter] // filter is object
```

### ✅ Do: Primitives only

```typescript
// Good - stable cache keys
queryKey: ['runs', filter?.status, filter?.search]
```

### ❌ Don't: Polling with refetchInterval

```typescript
// Bad
useQuery({
  queryKey: workflowKeys.runs(),
  queryFn: fetchRuns,
  refetchInterval: 5000, // ❌ Redundant with WebSocket
});
```

### ✅ Do: WebSocket updates

```typescript
// Good - use WebSocket for real-time
useWorkflowWebSocket(projectId); // Handles updates
```

### ❌ Don't: Custom staleTime per query

```typescript
// Bad
useQuery({
  queryKey: projectKeys.all,
  queryFn: fetchProjects,
  staleTime: 5 * 60 * 1000, // ❌ Override
});
```

### ✅ Do: Use global default

```typescript
// Good - respects global 1min default
useQuery({
  queryKey: projectKeys.all,
  queryFn: fetchProjects,
});
```

### ❌ Don't: Optimistic updates for forms

```typescript
// Bad - complex for minimal gain
useMutation({
  mutationFn: updateProject,
  onMutate: async (data) => {
    await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) });
    const prev = queryClient.getQueryData(projectKeys.detail(id));
    queryClient.setQueryData(projectKeys.detail(id), data);
    return { prev };
  },
  onError: (err, data, context) => {
    queryClient.setQueryData(projectKeys.detail(id), context.prev);
  },
});
```

### ✅ Do: Simple invalidation

```typescript
// Good - 50-200ms delay is acceptable
useMutation({
  mutationFn: updateProject,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
  },
});
```

## File Locations

Query key factories live alongside hooks:

```
pages/{feature}/hooks/
  queryKeys.ts        # Factory exports
  use{Feature}.ts     # Hook imports factory
```

**Examples:**
- `pages/projects/hooks/queryKeys.ts` → `projectKeys`
- `pages/projects/sessions/hooks/queryKeys.ts` → `sessionKeys`, `slashCommandKeys`
- `pages/projects/workflows/hooks/queryKeys.ts` → `workflowKeys`
- `pages/projects/git/hooks/queryKeys.ts` → `gitKeys`
- `pages/projects/files/hooks/queryKeys.ts` → `fileKeys`

## References

- [Effective React Query Keys - TkDodo](https://tkdodo.eu/blog/effective-react-query-keys)
- [Query Keys Guide - TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Query Key Factory Discussion](https://github.com/TanStack/query/discussions/3362)
