# MessageList Memoization Optimization

**Status**: draft
**Type**: issue
**Created**: 2025-11-24
**Package**: apps/app
**Total Complexity**: 11 points
**Tasks**: 4
**Avg Complexity**: 2.8/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 4        |
| Total Points    | 11       |
| Avg Complexity  | 2.8/10   |
| Max Task        | 4/10     |

## Overview

Opening the mobile sidebar is slow (500-1200ms) when chat sessions have many messages (50+) because MessageList re-renders all messages even when sidebar opens. This issue implements React memoization to prevent unnecessary re-renders when props haven't changed.

## User Story

As a mobile user
I want the sidebar to open instantly
So that I can quickly navigate between sessions without lag

## Technical Approach

Add React.memo() to MessageList component and stabilize its props to prevent re-renders when sidebar state changes. This requires:
- Stabilizing messages array reference from Zustand selector
- Wrapping onApprove callback in useCallback
- Memoizing MessageList component
- Memoizing filter operation

**Key Points**:
- Props must be stable for memo to work - unstable props defeat memoization
- messages array currently creates new reference on every store update
- onApprove callback recreated on every parent render
- Filter operation runs on every render unnecessarily

## Files to Create/Modify

### New Files (0)

None

### Modified Files (3)

1. `apps/app/src/client/hooks/useSession.ts` - Stabilize messages array selector
2. `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx` - Wrap onApprove in useCallback
3. `apps/app/src/client/pages/projects/sessions/components/session/MessageList.tsx` - Add React.memo and useMemo for filter

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] [task-1] [3/10] Stabilize messages array selector in useSession hook
  - Create stable empty array constant EMPTY_ARRAY outside component
  - Replace `session?.messages || []` with constant fallback
  - Use granular Zustand selector to avoid new references on unrelated changes
  - File: `apps/app/src/client/hooks/useSession.ts:46`

- [ ] [task-2] [2/10] Wrap handlePermissionApproval in useCallback
  - Import useCallback from react
  - Wrap handlePermissionApproval function with useCallback
  - Add dependencies: [sessionId, clearToolResultError, markPermissionHandled, handleSubmit]
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx:231`

- [ ] [task-3] [4/10] Add React.memo and useMemo to MessageList
  - Import React, useMemo from react
  - Extract filtered messages to useMemo with [messages] dependency
  - Wrap component export with React.memo()
  - File: `apps/app/src/client/pages/projects/sessions/components/session/MessageList.tsx`

- [ ] [task-4] [2/10] Test memoization effectiveness
  - Start dev server: `pnpm dev`
  - Open chat with 50+ messages on mobile viewport
  - Open sidebar and verify no console re-renders (use React DevTools Profiler)
  - Test streaming messages still update correctly
  - Test debug mode still works

## Testing Strategy

### Unit Tests

No new unit tests needed - behavioral change only (performance optimization)

### Integration Tests

**Manual Testing Required:**
- Sidebar toggle doesn't trigger MessageList re-render (verify with React DevTools)
- Streaming messages still update in real-time
- Permission approval still works
- Debug mode controls still function

## Success Criteria

- [ ] Sidebar opens instantly (<100ms) on mobile with 100+ messages
- [ ] MessageList doesn't re-render when sidebar opens (verified in React DevTools Profiler)
- [ ] Streaming messages continue to update correctly
- [ ] Permission approval flows work unchanged
- [ ] No TypeScript errors
- [ ] No console warnings about dependencies

## Validation

**Automated:**

```bash
# Type check
pnpm check-types
# Expected: no errors

# Build
pnpm build
# Expected: successful build
```

**Manual:**

1. Start app: `pnpm dev`
2. Navigate to: Project session with many messages
3. Open React DevTools Profiler
4. Toggle sidebar open/close
5. Verify: MessageList shows "Did not render" when sidebar toggles
6. Send new message
7. Verify: MessageList renders only for new message, not sidebar
8. Test streaming behavior works correctly
9. Test permission approval still functions

## Implementation Notes

### Stability Requirements

React.memo() uses shallow prop comparison by default. Both props must have stable references:
- `messages`: Currently unstable - Zustand creates new array on every update
- `onApprove`: Currently unstable - recreated on every parent render

If props aren't stable, memo is defeated and component re-renders anyway.

### Empty Array Fallback

Current code: `session?.messages || []` creates new empty array on every call when session is null. Must use stable constant:

```typescript
const EMPTY_ARRAY: UIMessage[] = [];
// then use: session?.messages || EMPTY_ARRAY
```

### Zustand Selector Granularity

Current useSession hook subscribes to entire currentSession object. Any property change (metadata, isStreaming, error, etc.) triggers new return object even if messages unchanged. Consider using more granular selectors if this becomes issue.

## Dependencies

- No new dependencies

## References

- Research document: Investigation of mobile sidebar performance issue
- Related files: `AgentSessionViewer.tsx`, `ChatInterface.tsx`
