# Session State Management Migration to Zustand

**Status**: draft
**Created**: 2025-11-22
**Package**: apps/app
**Total Complexity**: 156 points
**Phases**: 9
**Tasks**: 55
**Overall Avg Complexity**: 6.6/10

## Complexity Breakdown

| Phase                          | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------------ | ----- | ------------ | -------------- | -------- |
| Phase 0: Backend Full Payloads | 3     | 14           | 4.7/10         | 6/10     |
| Phase 1: Store Foundation      | 8     | 52           | 6.5/10         | 9/10     |
| Phase 2: API Layer             | 7     | 47           | 6.7/10         | 8/10     |
| Phase 3: Query Hooks           | 6     | 36           | 6.0/10         | 7/10     |
| Phase 4: WebSocket             | 5     | 30           | 6.0/10         | 7/10     |
| Phase 5: Components            | 10    | 65           | 6.5/10         | 8/10     |
| Phase 6: Mutations             | 4     | 24           | 6.0/10         | 7/10     |
| Phase 7: Testing               | 8     | 54           | 6.8/10         | 8/10     |
| Phase 8: Cleanup               | 4     | 16           | 4.0/10         | 5/10     |
| **Total**                      | **55** | **338**      | **6.1/10**     | **9/10** |

## Overview

Migrate all session-related state management from React Query + Zustand hybrid to Zustand-only architecture. Fixes race condition bug where user messages disappear after completion due to query invalidation overwriting optimistic updates. Establishes single source of truth for session data with Map-based storage supporting multi-session scenarios.

## User Story

As a developer maintaining the session system
I want all session state managed by Zustand with Map-based storage
So that race conditions are eliminated, state management is simplified, and the system supports multiple concurrent sessions

## Technical Approach

Replace React Query hooks (`useSessions`, `useSession`, `useSessionMessages`) with Zustand store actions and selectors. Convert single-session store to Map-based architecture (`sessions: Map<sessionId, SessionData>`, `sessionLists: Map<projectId, SessionSummary[]>`). Remove all `queryClient.invalidateQueries()` and `queryClient.setQueryData()` calls from WebSocket handlers. Update 15+ components to read from Zustand instead of React Query. Maintain message deduplication and streaming message tracking to handle edge cases.

## Key Design Decisions

1. **Map-Based Store**: Use `Map<sessionId, SessionData>` instead of single session to support multi-session scenarios (modals, multi-tab) and eliminate store replacement race conditions
2. **Single Source of Truth**: Zustand becomes the only state container for sessions - no dual RQ/Zustand sync logic needed
3. **Explicit Loading Actions**: Replace React Query auto-fetching with explicit `loadSession()`/`loadSessionList()` actions called from hooks/effects
4. **Keep React Query for Non-Session Data**: Projects, workflows, settings remain in React Query - only sessions migrate to Zustand
5. **Message Deduplication**: Track `messageIds: Set<string>` per session to prevent duplicate messages on WebSocket reconnect

## Architecture

### File Structure

```
apps/app/src/client/
├── stores/
│   └── sessionStore.ts                        # MAJOR REFACTOR - Map-based architecture
├── hooks/
│   ├── useSession.ts                          # NEW - Zustand-based hook
│   └── useSessionList.ts                      # NEW - Zustand-based hook
├── pages/projects/sessions/
│   ├── hooks/
│   │   ├── useAgentSessions.ts                # DELETE - All RQ hooks removed
│   │   └── useSessionWebSocket.ts             # MAJOR REFACTOR - Remove RQ calls
│   ├── stores/
│   │   └── sessionStore.ts                    # MAJOR REFACTOR - Map architecture
│   ├── NewSessionPage.tsx                     # MODIFY - Use Zustand actions
│   └── ProjectSessionPage.tsx                 # MODIFY - Use new hooks
├── components/
│   ├── AgentSessionViewer.tsx                 # MAJOR REFACTOR - Remove RQ sync
│   ├── sidebar/
│   │   └── NavActivities.tsx                  # MODIFY - Use useSessionList
│   └── CommandMenu.tsx                        # MODIFY - Use useSessionList
└── utils/
    └── queryKeys.ts                           # MODIFY - Remove sessionKeys
```

### Integration Points

**State Management**:
- `sessionStore.ts` - Core Map-based store with all session data
- `navigationStore.ts` - activeSessionId sync (unchanged)
- React Query - Remove session-related queries/mutations

**WebSocket**:
- `useSessionWebSocket.ts` - Direct Zustand updates, no RQ invalidations
- `WebSocketProvider.tsx` - Connection layer (unchanged)

**Components**:
- 15+ components updated to use Zustand hooks/selectors
- All session list/detail rendering from Zustand Map

**API Layer**:
- Session CRUD operations wrapped in Zustand actions
- Error handling and loading states in store

## Implementation Details

### 1. Map-Based Session Store

Replace single `session: SessionData | null` with `sessions: Map<sessionId, SessionData>` to support:
- Multi-session scenarios (modals showing session while main view has different session)
- Concurrent streaming across multiple sessions
- No session replacement race conditions

**Key Points**:
- Each session entry includes: `{ metadata, messages, isStreaming, loadingState, error, messageIds, streamingMessageId }`
- `activeSessionId: string | null` tracks current view
- Session lists stored per project: `sessionLists: Map<projectId, ListData>`
- Automatic cleanup: Keep last 5 sessions, LRU eviction

### 2. Message Deduplication

Track `messageIds: Set<string>` per session to prevent duplicates on:
- WebSocket reconnection (backend resends events)
- Concurrent updates from multiple tabs
- Race conditions in streaming flow

**Key Points**:
- Check Set before adding message
- Clear Set when session is evicted from cache
- Handle streaming messages with separate `streamingMessageId` tracking

### 3. Streaming Message Tracking

Prevent message replacement bug by finding streaming message by ID anywhere in array, not just as last message.

**Key Points**:
- If `updateStreamingMessage(msgId)` called, search entire messages array for msgId
- Only create new message if msgId not found
- Handles interleaved streaming (user submits while previous message still streaming)

### 4. Zustand Actions vs React Query Hooks

Direct API calls wrapped in Zustand actions:
- `loadSession(sessionId, projectId)` - Fetch and store session data
- `loadSessionList(projectId, filters)` - Fetch and store session list
- `createSession(projectId, data)` - Create new session
- `updateSession(sessionId, updates)` - Update session metadata
- `archiveSession(sessionId)` - Archive session

**Key Points**:
- Actions set loading/error states in store
- Actions return Promise for success/error handling
- No automatic refetching - components trigger loads explicitly

### 5. Component Hook Pattern

New hooks abstract Zustand store access:
- `useSession(sessionId, projectId)` - Auto-loads session if not in Map, returns { messages, metadata, isLoading, error }
- `useSessionList(projectId, filters)` - Auto-loads list if not in Map, returns { sessions, isLoading, error }

**Key Points**:
- Hooks trigger `loadSession()`/`loadSessionList()` in useEffect if data missing
- Use Zustand selectors for reactivity
- Return stable references (no new objects on every render)

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/client/hooks/useSession.ts` - Zustand-based session hook
2. `apps/app/src/client/hooks/useSessionList.ts` - Zustand-based session list hook

### Modified Files (18)

1. `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts` - Convert to Map architecture, add actions
2. `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Remove all RQ calls, use Zustand Map updates
3. `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts` - DELETE all hooks (useSessions, useSession, useSessionMessages, mutations)
4. `apps/app/src/client/utils/queryKeys.ts` - Remove sessionKeys factory
5. `apps/app/src/client/components/AgentSessionViewer.tsx` - Remove RQ hooks, use useSession, remove sync logic
6. `apps/app/src/client/components/sidebar/NavActivities.tsx` - Replace useSessions with useSessionList
7. `apps/app/src/client/components/CommandMenu.tsx` - Replace useSessions with useSessionList
8. `apps/app/src/client/pages/projects/sessions/NewSessionPage.tsx` - Use createSession action
9. `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx` - Simplified (delegates to AgentSessionViewer)
10. `apps/app/src/client/components/SessionHeader.tsx` - Use Zustand selector for metadata
11. `apps/app/src/client/components/SessionDropdownMenu.tsx` - Use Zustand actions (archive/unarchive)
12. `apps/app/src/client/components/sidebar/SessionListItem.tsx` - Props from Zustand list
13. `apps/app/src/client/layouts/AppLayout.tsx` - Remove RQ session prefetch/invalidation
14. `apps/app/src/client/pages/projects/components/ProjectHomeActivities.tsx` - Use useSessionList
15. `apps/app/src/client/pages/projects/sessions/components/SessionStateBadge.tsx` - Verify props still work
16. `apps/app/src/client/pages/projects/sessions/components/SessionItem.tsx` - Props from Zustand list
17. `apps/app/src/client/pages/projects/sessions/hooks/queryKeys.ts` - DELETE (or remove session keys)
18. `apps/app/src/client/providers/WebSocketProvider.tsx` - Verify compatibility (no changes)

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Store Foundation

**Phase Complexity**: 52 points (avg 6.5/10)

- [ ] 1.1 [9/10] Design and implement Map-based sessionStore architecture
  - Replace `session: SessionData | null` with `sessions: Map<sessionId, SessionData>`
  - Add `sessionLists: Map<projectId, { sessions: SessionSummary[], loading, error, lastFetched }>`
  - Add `activeSessionId: string | null`
  - Per-session state: `messageIds: Set<string>`, `streamingMessageId: string | null`
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 1.2 [7/10] Implement loadSession action
  - Fetch session metadata + messages from API
  - Handle loading/error states per session
  - Store in sessions Map with enrichment
  - Return Promise for error handling
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 1.3 [7/10] Implement loadSessionList action
  - Fetch session list from API with filters
  - Handle loading/error states per project
  - Store in sessionLists Map
  - Return Promise for error handling
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 1.4 [6/10] Implement createSession action
  - POST to /api/projects/:id/sessions
  - Add new session to sessions Map optimistically
  - Add to sessionLists Map
  - Return session data
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 1.5 [5/10] Implement updateSession action
  - PATCH /api/sessions/:id
  - Update sessions Map entry
  - Update sessionLists Map entry
  - Handle errors
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 1.6 [6/10] Implement archiveSession and unarchiveSession actions
  - POST to archive/unarchive endpoints
  - Update sessions Map (set is_archived)
  - Remove from sessionLists Map (archived = filtered out)
  - Handle errors
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 1.7 [8/10] Refactor message operations for Map architecture
  - Update `addMessage` to find session by ID in Map
  - Update `updateStreamingMessage` to search by messageId anywhere in array (not just last)
  - Update `finalizeMessage` for Map lookup
  - Add message deduplication (check messageIds Set)
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 1.8 [4/10] Implement memory management (LRU cache)
  - Keep last 5 sessions in Map
  - Evict oldest by lastAccessedAt
  - Clear messageIds Sets on eviction
  - Expose clearSession(sessionId) and clearAllSessions() actions
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: API Layer

**Phase Complexity**: 47 points (avg 6.7/10)

- [ ] 2.1 [7/10] Create Zustand-based useSession hook
  - Auto-load session if not in Map (useEffect)
  - Return `{ messages, metadata, isLoading, isStreaming, error }` from Map
  - Use Zustand selectors for specific session
  - Stable references (don't create new objects)
  - File: `apps/app/src/client/hooks/useSession.ts` (NEW)

- [ ] 2.2 [6/10] Create Zustand-based useSessionList hook
  - Auto-load list if not in Map (useEffect)
  - Return `{ sessions, isLoading, error }` from Map
  - Support filters parameter
  - Use Zustand selectors for specific project
  - File: `apps/app/src/client/hooks/useSessionList.ts` (NEW)

- [ ] 2.3 [8/10] Add API utilities for session operations
  - `api.sessions.getSession(sessionId, projectId)` - Fetch session + messages
  - `api.sessions.getSessions(projectId, filters)` - Fetch session list
  - `api.sessions.createSession(projectId, data)` - Create session
  - `api.sessions.updateSession(sessionId, updates)` - Update session
  - `api.sessions.archiveSession(sessionId)` - Archive session
  - File: `apps/app/src/client/utils/api/sessions.ts` (NEW or add to existing api utils)

- [ ] 2.4 [7/10] Add error handling and retry logic to store actions
  - Retry failed API calls (1 retry with exponential backoff)
  - Set error state in store on failure
  - Toast notifications on errors
  - Return Promise.reject for component error handling
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 2.5 [6/10] Add Zustand selectors for common queries
  - `selectSession(sessionId)` - Get session from Map
  - `selectSessionList(projectId)` - Get list from Map
  - `selectActiveSession()` - Get session by activeSessionId
  - `selectTotalTokens(sessionId)` - Sum tokens for session
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 2.6 [7/10] Implement optimistic updates for mutations
  - createSession: Add to Map before API returns
  - updateSession: Update Map before API returns
  - archiveSession: Update Map before API returns
  - Rollback on API error
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 2.7 [6/10] Add loading state management
  - Per-session loading: `loadingState: 'idle' | 'loading' | 'loaded' | 'error'`
  - Per-list loading: `loading: boolean`
  - Expose isLoading selectors
  - Handle concurrent load requests (deduplicate)
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Query Hooks Replacement

**Phase Complexity**: 36 points (avg 6.0/10)

- [ ] 3.1 [7/10] Update AgentSessionViewer to use useSession hook
  - Remove useSession and useSessionMessages React Query hooks
  - Remove RQ → Zustand sync useEffect (lines 86-145)
  - Use `useSession(sessionId, projectId)` Zustand hook
  - Remove shouldSkipFetch logic (Zustand handles this)
  - File: `apps/app/src/client/components/AgentSessionViewer.tsx`

- [ ] 3.2 [6/10] Update NavActivities to use useSessionList hook
  - Remove useSessions React Query hook
  - Use `useSessionList(projectId, { limit: 20, type: 'chat' })` Zustand hook
  - Verify sidebar renders correctly
  - Verify real-time updates still work
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`

- [ ] 3.3 [5/10] Update CommandMenu to use useSessionList hook
  - Remove useSessions React Query hook
  - Use `useSessionList(undefined, { limit: 10, orderBy: 'updated_at' })` (cross-project)
  - Verify command menu search works
  - Verify session grouping by project works
  - File: `apps/app/src/client/components/CommandMenu.tsx`

- [ ] 3.4 [6/10] Update ProjectHomeActivities to use useSessionList hook
  - Remove useSessions React Query hook
  - Use `useSessionList(projectId)` Zustand hook
  - Verify activity list renders
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeActivities.tsx`

- [ ] 3.5 [6/10] Update SessionHeader to use Zustand selectors
  - Remove props dependency on React Query (receives sessionId instead of full data)
  - Use `useSessionStore(s => s.sessions.get(sessionId))` selector
  - Update session name via updateSession action
  - File: `apps/app/src/client/components/SessionHeader.tsx`

- [ ] 3.6 [6/10] Update AppLayout session sync
  - Remove React Query prefetch/invalidation
  - Add Zustand session sync trigger on authentication
  - Call loadSessionList for active project on mount
  - File: `apps/app/src/client/layouts/AppLayout.tsx`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: WebSocket Integration

**Phase Complexity**: 38 points (avg 7.6/10)

- [ ] 4.1 [9/10] Refactor useSessionWebSocket to use Zustand Map updates
  - Remove ALL `queryClient.setQueryData()` calls (lines 191-210)
  - Remove ALL `queryClient.invalidateQueries()` calls (lines 171-173, 213-215)
  - Update STREAM_OUTPUT handler to use `sessionStore.updateStreamingMessage(sessionId, msgId, content)`
  - Update MESSAGE_COMPLETE handler to use `sessionStore.finalizeMessage(sessionId, msgId)`
  - Update SESSION_UPDATED handler to use `sessionStore.updateSession(sessionId, updates)`
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

- [ ] 4.2 [7/10] Add sessionId routing to WebSocket event handlers
  - Extract sessionId from channel name (`session:${sessionId}`)
  - Pass sessionId to all store actions
  - Verify Map updates target correct session
  - Handle case where session not in Map (load it)
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

- [ ] 4.3 [8/10] Update optimistic updates for session metadata
  - Remove React Query optimistic cache updates
  - Use Zustand `updateSession` for optimistic updates
  - Update sessionLists Map entry in sync with sessions Map
  - No rollback needed (WebSocket events are source of truth)
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

- [ ] 4.4 [7/10] Verify WebSocket event sequencing
  - Test STREAM_OUTPUT → MESSAGE_COMPLETE → SESSION_UPDATED sequence
  - Verify message deduplication works on reconnect
  - Verify streaming message tracking handles interleaved streams
  - Test multi-session streaming (two sessions streaming simultaneously)
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

- [ ] 4.5 [7/10] Handle WebSocket error and reconnection scenarios
  - On ERROR event: Set session error state in Map
  - On reconnection: Re-subscribe to session channels
  - Don't reload messages (use existing Map data)
  - Verify streaming state resets correctly
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 5: Component Updates

**Phase Complexity**: 65 points (avg 6.5/10)

- [ ] 5.1 [8/10] Update NewSessionPage to use createSession action
  - Remove direct `api.post()` call
  - Use `sessionStore.createSession(projectId, { agent, permission_mode, sessionId })`
  - Optimistic message addition still via `addMessage`
  - Verify navigation works after session creation
  - File: `apps/app/src/client/pages/projects/sessions/NewSessionPage.tsx`

- [ ] 5.2 [6/10] Update ProjectSessionPage (simplified)
  - Remove React Query hooks (delegates to AgentSessionViewer)
  - Verify sessionId routing still works
  - Verify permission approval flow still works
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx`

- [ ] 5.3 [7/10] Update SessionDropdownMenu to use Zustand actions
  - Replace useUpdateSession with `sessionStore.updateSession`
  - Replace useArchiveSession with `sessionStore.archiveSession`
  - Replace useUnarchiveSession with `sessionStore.unarchiveSession`
  - Add loading/error toast notifications
  - File: `apps/app/src/client/components/SessionDropdownMenu.tsx`

- [ ] 5.4 [5/10] Update SessionListItem props
  - Receive session data from Zustand list (parent passes props)
  - Verify state badge renders correctly
  - Verify navigation onClick works
  - File: `apps/app/src/client/components/sidebar/SessionListItem.tsx`

- [ ] 5.5 [5/10] Update SessionItem props
  - Similar to SessionListItem
  - Verify rendering and interaction
  - File: `apps/app/src/client/pages/projects/sessions/components/SessionItem.tsx`

- [ ] 5.6 [6/10] Verify ChatInterface unchanged
  - Receives messages from Zustand via AgentSessionViewer
  - No direct dependency on React Query
  - Test rendering with Zustand data
  - File: `apps/app/src/client/components/ChatInterface.tsx`

- [ ] 5.7 [6/10] Verify MessageList unchanged
  - Receives messages array as prop
  - No state management changes needed
  - Test rendering
  - File: `apps/app/src/client/components/MessageList.tsx`

- [ ] 5.8 [7/10] Update SessionStateBadge to work with Zustand data
  - Verify state prop comes from Zustand Map
  - Verify error_message tooltip works
  - Test idle/working/error states
  - File: `apps/app/src/client/pages/projects/sessions/components/SessionStateBadge.tsx`

- [ ] 5.9 [8/10] Verify permission approval flow works
  - Test tool permission denial → approval button → follow-up
  - Verify handledPermissions Set works with Map architecture
  - Test clearHandledPermissions on session switch
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx` + tool renderers

- [ ] 5.10 [7/10] Test navigation and routing
  - Test direct URL to session
  - Test navigation between sessions
  - Test back/forward browser buttons
  - Verify activeSessionId syncs correctly
  - File: Navigation across all session components

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 6: Mutation Cleanup

**Phase Complexity**: 24 points (avg 6.0/10)

- [ ] 6.1 [7/10] Remove useUpdateSession mutation hook
  - Delete from useAgentSessions.ts
  - Verify all usages replaced with sessionStore.updateSession
  - Search codebase for any remaining usages
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts`

- [ ] 6.2 [6/10] Remove useArchiveSession mutation hook
  - Delete from useAgentSessions.ts
  - Verify all usages replaced with sessionStore.archiveSession
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts`

- [ ] 6.3 [6/10] Remove useUnarchiveSession mutation hook
  - Delete from useAgentSessions.ts
  - Verify all usages replaced with sessionStore.unarchiveSession
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts`

- [ ] 6.4 [5/10] Verify no orphaned mutation references
  - Search for `useUpdateSession`, `useArchiveSession`, `useUnarchiveSession`
  - Remove any imports
  - Remove from test files
  - File: Global search

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 7: Testing

**Phase Complexity**: 54 points (avg 6.8/10)

- [ ] 7.1 [8/10] Test session creation flow (E2E)
  - NewSessionPage: Create session with message
  - Verify API call succeeds
  - Verify session added to Map
  - Verify navigation to session page
  - Verify messages display correctly
  - File: Manual + E2E test

- [ ] 7.2 [7/10] Test session list rendering
  - NavActivities: Verify sidebar loads sessions
  - CommandMenu: Verify command palette shows sessions
  - Verify filtering works (type: 'chat')
  - Verify sorting works
  - File: Manual test

- [ ] 7.3 [8/10] Test WebSocket streaming (CRITICAL)
  - Submit message → verify STREAM_OUTPUT updates
  - Verify MESSAGE_COMPLETE finalizes message
  - Verify SESSION_UPDATED syncs metadata
  - Verify no race conditions or lost messages
  - Test original bug scenario: Message after completion
  - File: Manual test

- [ ] 7.4 [7/10] Test navigation between sessions
  - Navigate Session A → Session B → Session A
  - Verify Map caching works (A not re-fetched)
  - Verify WebSocket re-subscription
  - Verify no memory leaks
  - File: Manual test

- [ ] 7.5 [6/10] Test archive/unarchive flow
  - Archive session → verify removed from sidebar
  - Unarchive session → verify reappears
  - Verify API calls succeed
  - Verify toast notifications
  - File: Manual test

- [ ] 7.6 [7/10] Test error scenarios
  - Session not found (404)
  - API error on creation
  - WebSocket disconnect during streaming
  - Network error on list load
  - File: Manual test

- [ ] 7.7 [6/10] Test edge cases
  - Rapid session switching
  - Multiple sessions streaming simultaneously
  - WebSocket reconnect during streaming
  - User submits while previous message streaming
  - File: Manual test

- [ ] 7.8 [5/10] Update unit tests
  - Update sessionStore tests for Map architecture
  - Update component tests to mock Zustand instead of RQ
  - Update WebSocket handler tests
  - File: All test files

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 8: Cleanup

**Phase Complexity**: 16 points (avg 4.0/10)

- [ ] 8.1 [5/10] Delete useAgentSessions.ts
  - Remove all React Query hooks (useSessions, useSession, useSessionMessages)
  - Remove mutation hooks (useUpdateSession, useArchiveSession, useUnarchiveSession)
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts` (DELETE)

- [ ] 8.2 [4/10] Remove sessionKeys from queryKeys.ts
  - Delete sessionKeys factory
  - Remove exports
  - Verify no remaining references
  - File: `apps/app/src/client/utils/queryKeys.ts`

- [ ] 8.3 [4/10] Remove React Query imports from session components
  - Search for `@tanstack/react-query` imports in session files
  - Remove unused imports
  - File: All session components

- [ ] 8.4 [3/10] Update documentation
  - Update CLAUDE.md with Zustand session pattern
  - Document Map-based architecture
  - Document migration notes
  - File: `CLAUDE.md`, `.agent/docs/architecture-decisions.md`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`sessionStore.test.ts`** - Test Map-based store:

```typescript
describe('sessionStore', () => {
  it('should add session to Map on loadSession', async () => {
    await sessionStore.getState().loadSession('session-1', 'project-1');
    expect(sessionStore.getState().sessions.has('session-1')).toBe(true);
  });

  it('should deduplicate messages by ID', () => {
    sessionStore.getState().addMessage('session-1', { id: 'msg-1', ... });
    sessionStore.getState().addMessage('session-1', { id: 'msg-1', ... }); // Duplicate
    const messages = sessionStore.getState().sessions.get('session-1').messages;
    expect(messages.length).toBe(1);
  });

  it('should find streaming message by ID anywhere in array', () => {
    // User msg, streaming assistant msg, user msg
    sessionStore.getState().addMessage('session-1', userMsg1);
    sessionStore.getState().updateStreamingMessage('session-1', 'msg-2', []);
    sessionStore.getState().addMessage('session-1', userMsg2);

    // Update streaming message (not last in array)
    sessionStore.getState().updateStreamingMessage('session-1', 'msg-2', [newContent]);

    const messages = sessionStore.getState().sessions.get('session-1').messages;
    expect(messages[1].content).toEqual([newContent]);
  });
});
```

**`useSession.test.ts`** - Test Zustand hook:

```typescript
describe('useSession', () => {
  it('should auto-load session if not in Map', async () => {
    const { result } = renderHook(() => useSession('session-1', 'project-1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.messages.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

**WebSocket Event Handling:**
- Mock WebSocket events (STREAM_OUTPUT, MESSAGE_COMPLETE, SESSION_UPDATED)
- Verify store updates correctly for each event
- Verify no React Query calls made

**Component Integration:**
- Render AgentSessionViewer with Zustand data
- Verify ChatInterface renders messages from store
- Verify real-time updates on WebSocket events

### E2E Tests

**`session-creation.e2e.test.ts`** - Full session creation flow:

```typescript
test('should create session and display messages', async () => {
  await page.goto('/projects/123/sessions/new');
  await page.fill('[data-testid="message-input"]', 'Hello');
  await page.click('[data-testid="send-button"]');

  await page.waitForURL('/projects/123/sessions/*');
  await expect(page.locator('[data-testid="message"]')).toContainText('Hello');
});
```

## Success Criteria

- [ ] Original bug fixed: User messages no longer disappear after completion
- [ ] All 15+ components render correctly with Zustand data
- [ ] Sidebar session list loads and displays sessions
- [ ] Command menu session search works
- [ ] Session page loads messages correctly
- [ ] WebSocket streaming updates messages in real-time
- [ ] Navigation between sessions works without re-fetching cached sessions
- [ ] Archive/unarchive mutations work
- [ ] Session rename works
- [ ] No React Query session-related queries remain
- [ ] No `queryClient.invalidateQueries` calls in WebSocket handlers
- [ ] All tests pass (unit, integration, E2E)
- [ ] Build succeeds with no type errors
- [ ] No console errors or warnings

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: All packages build successfully

# Type checking
pnpm check-types
# Expected: 0 type errors

# Linting
pnpm check
# Expected: 0 lint errors

# Unit tests
pnpm --filter app test sessionStore
# Expected: All store tests pass

# Integration tests
pnpm --filter app test useSession
# Expected: All hook tests pass

# E2E tests (if implemented)
pnpm --filter app test:e2e session
# Expected: All session E2E tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/sessions/new`
3. Create session: Type message, submit
4. Verify: Session page loads, message displays
5. Verify: Sidebar shows new session in list
6. Test streaming: Submit another message, verify real-time updates
7. Test navigation: Click different session in sidebar, verify loads without flicker
8. Test archive: Archive session, verify removed from sidebar
9. Test unarchive: Unarchive, verify reappears
10. Check console: No errors or warnings

**Feature-Specific Checks:**

- Original bug scenario: Create session, wait for completion, submit 2nd message immediately → Verify message NOT wiped out
- Multi-session: Open session in main view, open different session in modal (future) → Verify both have correct data
- WebSocket reconnect: Disconnect network, reconnect → Verify messages not duplicated
- Rapid switching: Quickly switch between 5 sessions → Verify no memory leaks, correct data

## Implementation Notes

### 1. Map.get() Returns Undefined

Zustand selectors must handle `Map.get()` returning `undefined`:

```typescript
const session = useSessionStore(s => s.sessions.get(sessionId));
if (!session) return <Loading />;
```

### 2. Message Deduplication Critical

Without `messageIds` Set, WebSocket reconnect causes duplicate messages. Always check Set before adding.

### 3. Streaming Message ID Tracking

Original bug was checking only last message. New implementation searches entire array by ID to handle interleaved streams.

### 4. LRU Cache Prevents Memory Leaks

Without eviction, Map grows indefinitely. Evict oldest sessions when size > 5, clear messageIds Sets.

### 5. No Automatic Refetching

Unlike React Query, Zustand doesn't auto-refetch stale data. Components must explicitly call `loadSession()` when needed.

## Dependencies

- No new dependencies required
- Existing: `zustand` (already in use)
- Existing: `@tanstack/react-query` (will remove session-related usage, keep for other domains)

## References

- Zustand docs: https://docs.pmnd.rs/zustand/getting-started/introduction
- Original bug analysis: Conversation history
- Current sessionStore: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
- React Query patterns: `apps/app/src/client/hooks/api/`

## Next Steps

1. Review this spec and confirm approach
2. Start with Phase 1 (Store Foundation) - highest complexity
3. Implement Map-based architecture in sessionStore.ts
4. Add loadSession/loadSessionList actions
5. Create useSession/useSessionList hooks
6. Update components one by one, testing as you go
7. Remove React Query hooks and imports last
8. Comprehensive testing before merge
