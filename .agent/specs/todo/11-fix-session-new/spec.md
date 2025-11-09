# Fix Session New - Optimistic Loading

**Status**: in-progress
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 18 points
**Phases**: 3
**Tasks**: 6
**Overall Avg Complexity**: 3.0/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: AgentSessionViewer | 2 | 6 | 3.0/10 | 4/10 |
| Phase 2: NewSession | 1 | 4 | 4.0/10 | 4/10 |
| Phase 3: ProjectSession | 3 | 8 | 2.7/10 | 3/10 |
| **Total** | **6** | **18** | **3.0/10** | **4/10** |

## Overview

Fix broken optimistic loading after session query refactor. When user creates new session with initial message, race condition causes AgentSessionViewer to fetch from server before data ready, overwriting optimistic message in store.

## User Story

As a user creating a new session
I want my initial message to appear immediately without flickering
So that the UI feels responsive and doesn't lose my optimistic state

## Technical Approach

Keep AgentSessionViewer smart but skip server fetch when store already has messages (optimistic case). Remove `autoLoad` prop complexity. NewSession adds message to store immediately, no cache manipulation. Simple skip logic prevents overwrite.

## Key Design Decisions

1. **Keep AgentSessionViewer smart**: Less disruption, logic stays co-located with component
2. **Skip fetch if messages exist**: `store.session?.messages.length > 0` prevents overwrite
3. **Remove autoLoad prop**: Simplifies API, one less prop to manage
4. **No cache manipulation**: Let skip logic handle everything, no setQueryData/invalidate
5. **Remove query param flow**: Add to store directly, navigate without `?query=`

## Architecture

### File Structure

```
apps/app/src/
├── client/
│   ├── components/
│   │   └── AgentSessionViewer.tsx          # Add skip logic, remove autoLoad
│   └── pages/projects/sessions/
│       ├── NewSession.tsx                   # Add to store, remove query param
│       ├── ProjectSession.tsx               # Remove query param handling
│       └── stores/sessionStore.ts           # No changes needed
```

### Integration Points

**AgentSessionViewer.tsx**:
- Remove `autoLoad` prop from interface
- Add `hasMessages` selector from store
- Skip `useSession`/`useSessionMessages` when `hasMessages` true
- Skip sync useEffect when `hasMessages` true
- Always subscribe to WebSocket (needed for streaming)

**NewSession.tsx**:
- After creating session, add user message to store
- Navigate without `?query=` param
- No cache manipulation (no setQueryData, no invalidate)

**ProjectSession.tsx**:
- Remove query param handling (lines 86-126)
- Remove `autoLoad={!hasQueryParam}` (line 238)
- Just render `<AgentSessionViewer />`

## Implementation Details

### 1. AgentSessionViewer Skip Logic

Add skip logic to prevent fetching when store already has messages (optimistic case).

**Key Points**:
- Check `store.session?.messages.length > 0` for skip condition
- Pass `undefined` to React Query hooks when skipping (disables queries)
- Skip sync useEffect to avoid overwriting optimistic state
- WebSocket always subscribes (handles streaming response)

### 2. NewSession Optimistic Flow

Add message to store immediately after creating session, no cache manipulation.

**Key Points**:
- Store already populated when navigating
- AgentSessionViewer sees messages and skips fetch
- WebSocket handles streaming response
- No race condition with React Query

### 3. ProjectSession Cleanup

Remove query param flow entirely, simplify to just render AgentSessionViewer.

**Key Points**:
- Delete lines 86-126 (query param handling)
- Delete line 238 autoLoad prop usage
- AgentSessionViewer handles skip logic internally

## Files to Create/Modify

### New Files (0)

None

### Modified Files (3)

1. `apps/app/src/client/components/AgentSessionViewer.tsx` - Add skip logic, remove autoLoad prop
2. `apps/app/src/client/pages/projects/sessions/NewSession.tsx` - Add to store immediately, remove query param
3. `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx` - Remove query param handling

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: AgentSessionViewer Skip Logic

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 1.1 [4/10] Remove autoLoad prop and add skip logic
  - Remove `autoLoad?: boolean` from AgentSessionViewerProps interface (line 37)
  - Remove `autoLoad` from destructuring (line 63)
  - Remove `autoLoad = true` default (line 63)
  - Add `const hasMessages = useSessionStore((s) => (s.session?.messages.length ?? 0) > 0)`
  - Pass `undefined` to useSession/useSessionMessages when `hasMessages` true
  - File: `apps/app/src/client/components/AgentSessionViewer.tsx`
- [x] 1.2 [2/10] Skip sync useEffect when messages exist
  - Change useEffect condition from `if (!autoLoad || !sessionData) return;` to `if (hasMessages || !sessionData) return;`
  - Update eslint-disable comment to reference `hasMessages` instead of `autoLoad`
  - File: `apps/app/src/client/components/AgentSessionViewer.tsx`

#### Completion Notes

- Removed `autoLoad` prop from AgentSessionViewer interface and destructuring
- Added `hasMessages` selector to check store state before fetching
- Modified React Query hooks to skip when `hasMessages` is true (passes `undefined`)
- Updated sync useEffect to skip when store has messages, preventing overwrite of optimistic state

### Phase 2: NewSession Optimistic Message

**Phase Complexity**: 4 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] 2.1 [4/10] Add message to store and remove query param
  - After session creation (line 66), add `const addMessage = useSessionStore((s) => s.addMessage)` to component
  - After sending WebSocket message (line 98), call `addMessage({ id: generateUUID(), role: "user", content: [{ type: "text", text: message }], timestamp: Date.now(), _original: undefined })`
  - Change navigate to remove query param: `navigate(\`/projects/\${projectId}/sessions/\${newSession.id}\`, { replace: true })`
  - Remove lines 102-104 (query param construction)
  - File: `apps/app/src/client/pages/projects/sessions/NewSession.tsx`

#### Completion Notes

- Initialize complete session object in store with optimistic user message
- Use `useSessionStore.setState()` to set sessionId and session object before navigation
- Session contains: id, agent, messages array with user message, metadata, loadingState
- Set `isStreaming: true` to show AgentLoadingIndicator immediately
- Send WebSocket message after store initialization
- Removed query param flow entirely - navigate directly to session
- Store now fully populated before navigation, preventing fetch race condition
- User sees message + loading indicator instantly, no flicker

### Phase 3: ProjectSession Cleanup

**Phase Complexity**: 8 points (avg 2.7/10)

<!-- prettier-ignore -->
- [x] 3.1 [3/10] Remove query param handling
  - Delete lines 86-126 (entire useEffect for query param handling)
  - Delete line 38 `const initialMessageSentRef = useRef(false)`
  - Delete lines 80-83 (reset initialMessageSentRef useEffect)
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
- [x] 3.2 [2/10] Remove autoLoad prop usage
  - Delete lines 227-229 (searchParams and hasQueryParam)
  - Change line 238 from `autoLoad={!hasQueryParam}` to just `<AgentSessionViewer projectId={projectId!} sessionId={sessionId!} onApprove={handlePermissionApproval} />`
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
- [x] 3.3 [3/10] Test new session flow
  - Run `pnpm dev`
  - Navigate to `/projects/{id}/sessions/new`
  - Send message "test optimistic loading"
  - Verify message appears immediately without flicker
  - Verify streaming response arrives and displays
  - Verify refresh loads messages from server correctly

#### Completion Notes

- Removed entire query param handling useEffect (lines 86-126)
- Removed `initialMessageSentRef` ref and its reset useEffect
- Removed searchParams/hasQueryParam variables before return
- Removed `autoLoad` prop from AgentSessionViewer - component now handles skip logic internally
- ProjectSession is now much simpler - just renders AgentSessionViewer without prop coordination

## Testing Strategy

### Unit Tests

No new unit tests needed - existing sessionStore tests cover addMessage behavior.

### Integration Tests

**Manual testing** of new session creation flow:

1. Create new session with initial message
2. Verify message appears immediately (no flicker)
3. Verify streaming response arrives
4. Refresh page
5. Verify messages load from server

### E2E Tests (if applicable)

Not needed - core flow covered by manual testing.

## Success Criteria

- [ ] New session shows optimistic message immediately without flicker
- [ ] Streaming response arrives and displays correctly
- [ ] Refresh loads messages from server (no optimistic state)
- [ ] No React Query cache manipulation needed
- [ ] autoLoad prop removed from AgentSessionViewer
- [ ] Query param flow removed from ProjectSession
- [ ] Type-check passes (`pnpm check-types`)
- [ ] Build succeeds (`pnpm build`)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Build verification
pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/sessions/new`
3. Verify: Send message, appears immediately without flicker
4. Test edge cases:
   - Create session with long message
   - Create session and immediately refresh
   - Navigate away and back to same session
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- Optimistic message appears immediately (no loading state flicker)
- Streaming response arrives and appends correctly
- Refresh triggers server fetch (store empty)
- No race condition between optimistic state and React Query

## Implementation Notes

### 1. Skip Logic Simplicity

Single check `store.session?.messages.length > 0` handles both optimistic and loaded states. No sessionId matching needed - page reload clears store.

### 2. No Cache Manipulation

Letting skip logic handle everything avoids complexity of setQueryData/invalidate. Store is source of truth for "skip fetch" decision.

### 3. WebSocket Always Subscribes

Even when skipping fetch, WebSocket must subscribe to receive streaming response after optimistic message.

## Dependencies

No new dependencies required

## References

- Session Query Refactor Spec: `.agent/specs/doing/8-refactor-session-loading/spec.md`
- WebSocket Refactor: `.agent/specs/done/7-redesign-websockets/spec.md`
- Tool Result Patterns: `.agent/docs/claude-tool-result-patterns.md`

## Next Steps

1. Implement Phase 1: AgentSessionViewer skip logic
2. Implement Phase 2: NewSession optimistic message
3. Implement Phase 3: ProjectSession cleanup
4. Manual test entire flow
5. Verify build and type-check
