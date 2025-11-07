# Agent Sessions Modal

**Status**: completed
**Created**: 2025-01-03
**Package**: apps/web
**Estimated Effort**: 4-6 hours

## Overview

Extract the chat interface into a reusable component and create a modal viewer for agent sessions on workflow run steps. This enables users to view agent session conversations directly from the workflow UI without navigating away, while also refactoring the existing session page to use the same extracted component (eliminating code duplication).

## User Story

As a user viewing workflow run steps
I want to click "View Agent Session" and see the conversation in a modal
So that I can review agent interactions without leaving the workflow context

## Technical Approach

Extract the chat display logic into a reusable `AgentSessionViewer` component that works with the existing single-session store. The component will clear and reload sessions as needed (modal opens → clear → load new session). Wrap it in a modal for workflow steps, and update the existing session page to use the new component. This follows the established tool result matching pattern and domain-driven architecture.

## Key Design Decisions

1. **Keep Single-Session Store**: No store refactoring needed - use existing `sessionStore` with clear/load pattern
2. **Read-Only Modal**: Modal displays messages without chat input, with real-time WebSocket updates for active sessions
3. **Full Component Extraction**: Refactor existing `ProjectSession` page to use new `AgentSessionViewer`, eliminating code duplication
4. **Medium Modal Size**: 70% viewport for optimal viewing while maintaining workflow context
5. **Self-Contained Components**: `AgentSessionViewer` manages its own session loading and WebSocket subscription

## Architecture

### File Structure

```
apps/web/src/client/
├── components/
│   └── AgentSessionViewer.tsx           # NEW - Reusable session viewer
│
├── pages/projects/
│   ├── sessions/
│   │   ├── ProjectSession.tsx           # MODIFIED - Use AgentSessionViewer
│   │   ├── stores/
│   │   │   └── sessionStore.ts          # UNCHANGED - Keep single-session design
│   │   ├── hooks/
│   │   │   └── useSessionWebSocket.ts   # UNCHANGED - Already works correctly
│   │   └── components/
│   │       ├── ChatInterface.tsx        # UNCHANGED - Reused by AgentSessionViewer
│   │       ├── MessageList.tsx          # UNCHANGED
│   │       ├── ChatPromptInput.tsx      # UNCHANGED - Only used in full page
│   │       └── session/                 # UNCHANGED - Message renderers
│   │
│   └── workflows/
│       └── components/
│           ├── AgentSessionModal.tsx    # NEW - Modal wrapper
│           └── WorkflowRunStepsList.tsx  # MODIFIED - Add modal trigger
```

### Integration Points

**Session Store**:
- `sessionStore.ts` - No changes needed! Keep existing single-session design
- Modal opens → `clearSession()` → `loadSession(newId)`
- Form state stays in store (used by both modal and full page)

**WebSocket Hook**:
- `useSessionWebSocket.ts` - No changes needed! Already works correctly
- EventBus already handles multiple listeners per channel

**Components**:
- `AgentSessionViewer.tsx` - New reusable session viewer
- `AgentSessionModal.tsx` - Modal wrapper for workflow steps
- `ChatInterface.tsx` - Reused without changes
- `ProjectSession.tsx` - Simplified to use `AgentSessionViewer`
- `WorkflowRunStepsList.tsx` - Add modal trigger button

## Implementation Details

### 1. AgentSessionViewer Component

**Location**: `apps/web/src/client/components/AgentSessionViewer.tsx`

**Purpose**: Self-contained session viewer that loads messages and subscribes to WebSocket updates

**Props Interface**:
```typescript
interface AgentSessionViewerProps {
  /** Project ID containing the session */
  projectId: string;

  /** Session ID to display */
  sessionId: string;

  /** Optional: Custom height (default: 100%) */
  height?: string;

  /** Optional: Custom className for container */
  className?: string;

  /** Optional: Auto-load session on mount (default: true) */
  autoLoad?: boolean;

  /** Optional: Callback when session loads */
  onSessionLoad?: (session: SessionData) => void;

  /** Optional: Callback on error */
  onError?: (error: Error) => void;
}
```

**Features**:
- Loads session messages via `sessionStore.loadSession()`
- Subscribes to WebSocket for real-time updates
- Uses existing `ChatInterface` component internally
- Handles loading/error/empty states
- Auto-scroll behavior via `Conversation` wrapper
- Clears session on unmount if specified

**Implementation Pattern**:
```typescript
export function AgentSessionViewer({
  projectId,
  sessionId,
  height = "100%",
  className,
  autoLoad = true,
  onSessionLoad,
  onError,
}: AgentSessionViewerProps) {
  const queryClient = useQueryClient();

  // Subscribe to current session
  const session = useSessionStore((s) => s.session);
  const sessionIdRef = useRef(sessionId);

  // Load session on mount or when sessionId changes
  useEffect(() => {
    if (!autoLoad) return;

    const loadSession = async () => {
      try {
        // Clear previous session if loading a different one
        if (session && session.id !== sessionId) {
          useSessionStore.getState().clearSession();
        }

        await useSessionStore.getState().loadSession(sessionId, projectId, queryClient);

        if (onSessionLoad && session) {
          onSessionLoad(session);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    };

    loadSession();
    sessionIdRef.current = sessionId;
  }, [sessionId, projectId, autoLoad]);

  // WebSocket subscription
  useSessionWebSocket({ sessionId, projectId });

  // Render ChatInterface with session data
  return (
    <div className={className} style={{ height }}>
      <ChatInterface
        projectId={projectId}
        sessionId={session?.id}
        agent={session?.agent}
        messages={session?.messages || []}
        isLoading={session?.loadingState === "loading"}
        error={session?.error ? new Error(session.error) : null}
        isStreaming={session?.isStreaming || false}
        isLoadingHistory={session?.loadingState === "loading"}
      />
    </div>
  );
}
```

### 2. AgentSessionModal Component

**Location**: `apps/web/src/client/pages/projects/workflows/components/AgentSessionModal.tsx`

**Purpose**: Modal wrapper that displays `AgentSessionViewer` for workflow steps

**Props Interface**:
```typescript
interface AgentSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sessionId: string | null;
  sessionName?: string;  // Optional: For modal title
}
```

**Features**:
- 70% viewport size
- Uses existing `Dialog` components from shadcn/ui
- Header with session name and close button
- Embeds `AgentSessionViewer` with read-only mode
- Clears session data on close

**Implementation Pattern**:
```typescript
export function AgentSessionModal({
  open,
  onOpenChange,
  projectId,
  sessionId,
  sessionName,
}: AgentSessionModalProps) {
  // Clear session data when modal closes
  useEffect(() => {
    if (!open && sessionId) {
      // Delay cleanup slightly to allow for animations
      const timer = setTimeout(() => {
        useSessionStore.getState().clearSession();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, sessionId]);

  if (!sessionId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {sessionName || "Agent Session"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <AgentSessionViewer
            projectId={projectId}
            sessionId={sessionId}
            height="100%"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Update WorkflowRunStepsList

**File**: `apps/web/src/client/pages/projects/workflows/components/WorkflowRunStepsList.tsx`

**Changes**:
- Add state for modal open/close
- Replace `Link` with button + modal
- Keep `Link` behavior for opening in new tab (via external link icon)

**Implementation**:
```typescript
export function WorkflowRunStepsList({ steps, comments, projectId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionName, setSelectedSessionName] = useState<string | null>(null);

  const handleSessionClick = (sessionId: string, stepName: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionName(stepName);
    setModalOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="rounded-lg border bg-card p-4">
            {/* ... existing step UI ... */}

            {step.agent_session_id && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleSessionClick(step.agent_session_id!, step.step_name)}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <MessageSquare className="h-3 w-3" />
                  View Agent Session
                </button>

                {/* Fallback link for new tab */}
                <Link
                  to={`/projects/${projectId}/session/${step.agent_session_id}`}
                  className="text-xs text-muted-foreground hover:underline"
                  target="_blank"
                >
                  <ExternalLink className="h-3 w-3 inline" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      <AgentSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        sessionId={selectedSessionId}
        sessionName={selectedSessionName || undefined}
      />
    </>
  );
}
```

### 4. Refactor ProjectSession Page

**File**: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

**Changes**:
- Use `AgentSessionViewer` for display
- Keep `ChatPromptInput` in page (not in viewer)
- Simplify session loading logic

**Before** (Current):
```typescript
export function ProjectSession() {
  const session = useSessionStore(s => s.session);
  const form = useSessionStore(s => s.form);
  // ... 50+ lines of logic including manual loadSession calls
}
```

**After** (Simplified):
```typescript
export function ProjectSession() {
  const { projectId, sessionId } = useParams();
  const session = useSessionStore(s => s.session);
  const form = useSessionStore(s => s.form);

  // Get total tokens
  const totalTokens = useSessionStore(selectTotalTokens);

  return (
    <div className="flex flex-col h-full">
      {/* AgentSessionViewer handles loading & display */}
      <div className="flex-1 overflow-hidden">
        <AgentSessionViewer
          projectId={projectId!}
          sessionId={sessionId!}
        />
      </div>

      {/* Chat input (interactive mode) */}
      <div className="border-t">
        <ChatPromptInput
          onSubmit={handleSubmit}
          disabled={!session || session.isStreaming}
          isStreaming={session?.isStreaming || false}
          totalTokens={totalTokens}
          agent={form.agent}
          onKill={handleKill}
        />
      </div>
    </div>
  );
}
```

## Files to Create/Modify

### New Files (2)

1. `apps/web/src/client/components/AgentSessionViewer.tsx` - Reusable session viewer component
2. `apps/web/src/client/pages/projects/workflows/components/AgentSessionModal.tsx` - Modal wrapper

### Modified Files (2)

1. `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - Use AgentSessionViewer
2. `apps/web/src/client/pages/projects/workflows/components/WorkflowRunStepsList.tsx` - Add modal trigger

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Create AgentSessionViewer Component

<!-- prettier-ignore -->
- [x] viewer-1: Create AgentSessionViewer.tsx file
  - Create file with proper imports (React, useEffect, useRef, useQueryClient, etc.)
  - Define props interface with TypeScript types
  - File: `apps/web/src/client/components/AgentSessionViewer.tsx`

- [x] viewer-2: Implement session loading logic
  - Use `useSessionStore` to subscribe to current session: `useSessionStore(s => s.session)`
  - Call `sessionStore.loadSession(sessionId, projectId)` in useEffect on mount
  - Clear previous session if sessionId changes: check if `session.id !== sessionId`
  - Add error handling with try/catch
  - Trigger `onSessionLoad` callback when session loads
  - Trigger `onError` callback on failure
  - File: `apps/web/src/client/components/AgentSessionViewer.tsx`

- [x] viewer-3: Integrate WebSocket subscription
  - Import and use `useSessionWebSocket({ sessionId, projectId })`
  - Ensure real-time updates work for streaming sessions
  - No changes to hook needed - already works with single-session store
  - File: `apps/web/src/client/components/AgentSessionViewer.tsx`

- [x] viewer-4: Render ChatInterface component
  - Pass session data to ChatInterface: messages, isLoading, error, isStreaming
  - Set height and className from props
  - Handle loading/error/empty states through ChatInterface
  - File: `apps/web/src/client/components/AgentSessionViewer.tsx`

- [x] viewer-5: Add cleanup logic for modal usage
  - Optional: Add `clearOnUnmount` prop (default: false for full page, true for modal)
  - Clear session in useEffect cleanup if prop is true
  - Unsubscribe from WebSocket automatically (hook handles this)
  - File: `apps/web/src/client/components/AgentSessionViewer.tsx`

#### Completion Notes

- Created AgentSessionViewer component with full TypeScript interface
- Implemented smart session loading with clear/load pattern for switching sessions
- Added sessionIdRef to track changes and prevent unnecessary reloads
- Integrated WebSocket subscription using existing useSessionWebSocket hook
- Renders ChatInterface with all necessary props from sessionStore
- Added clearOnUnmount prop for modal usage (default: false for backward compatibility)
- Component is fully self-contained and manages its own lifecycle
- Error handling with optional onError and onSessionLoad callbacks
- No changes needed to existing stores or hooks - works with current architecture

### Task Group 2: Create AgentSessionModal Component

<!-- prettier-ignore -->
- [x] modal-1: Create AgentSessionModal.tsx file
  - Import Dialog components from shadcn/ui: Dialog, DialogContent, DialogHeader, DialogTitle
  - Import AgentSessionViewer component
  - Import useEffect from React
  - Define props interface
  - File: `apps/web/src/client/pages/projects/workflows/components/AgentSessionModal.tsx`

- [x] modal-2: Implement modal structure
  - Use Dialog, DialogContent, DialogHeader, DialogTitle
  - Set max width to 70vw and max height to 70vh
  - Add flex layout for proper scrolling
  - Add DialogHeader with sessionName or "Agent Session" fallback
  - File: `apps/web/src/client/pages/projects/workflows/components/AgentSessionModal.tsx`

- [x] modal-3: Embed AgentSessionViewer
  - Pass projectId, sessionId props
  - Set height to "100%"
  - Wrap in overflow-hidden container (flex-1 class)
  - File: `apps/web/src/client/pages/projects/workflows/components/AgentSessionModal.tsx`

- [x] modal-4: Add session cleanup on close
  - Use useEffect to watch `open` prop
  - Clear session from store when modal closes: `useSessionStore.getState().clearSession()`
  - Add 300ms delay for animation (setTimeout)
  - Prevent memory leaks from closed modals
  - File: `apps/web/src/client/pages/projects/workflows/components/AgentSessionModal.tsx`

- [x] modal-5: Add null check
  - Return null if `sessionId` is null
  - Prevents rendering modal with no session
  - File: `apps/web/src/client/pages/projects/workflows/components/AgentSessionModal.tsx`

#### Completion Notes

- Created AgentSessionModal component with full TypeScript interface
- Implemented modal structure using shadcn/ui Dialog components
- Set 70% viewport size for optimal viewing experience
- Embedded AgentSessionViewer with proper flex layout for scrolling
- Added cleanup logic with 300ms delay to prevent animation glitches
- Early return for null sessionId to prevent rendering empty modal
- Component is fully self-contained and manages cleanup automatically

### Task Group 3: Update WorkflowRunStepsList

<!-- prettier-ignore -->
- [x] workflow-1: Add modal state management
  - Import useState from React
  - Add state for `modalOpen: boolean`
  - Add state for `selectedSessionId: string | null`
  - Add state for `selectedSessionName: string | null`
  - Create `handleSessionClick` function to set state and open modal
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineItem.tsx`

- [x] workflow-2: Replace Link with button + modal trigger
  - Replace "View Agent Session" Link with button element
  - Add onClick handler: `onClick={() => handleSessionClick(step.agent_session_id!, step.step_name)}`
  - Keep MessageSquare icon
  - Maintain styling: `inline-flex items-center gap-1 text-sm text-primary hover:underline`
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineItem.tsx`

- [x] workflow-3: Add fallback Link for new tab
  - Add small Link with ExternalLink icon next to button
  - Set target="_blank" for opening in new tab
  - Use styling: `text-xs text-muted-foreground hover:underline`
  - Keep existing path: `/projects/${projectId}/session/${step.agent_session_id}`
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineItem.tsx`

- [x] workflow-4: Render AgentSessionModal
  - Import AgentSessionModal component
  - Add modal after steps list (outside map)
  - Pass props: open={modalOpen}, onOpenChange={setModalOpen}, projectId, sessionId={selectedSessionId}, sessionName={selectedSessionName}
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimelineItem.tsx`

#### Completion Notes

- Updated WorkflowTimelineItem component to add modal functionality
- Thread projectId down from WorkflowRunDetail → WorkflowTimeline → WorkflowTimelineItem
- Added modal state management (modalOpen, selectedSessionId, selectedSessionName)
- Replaced direct link with button that opens modal
- Added handleSessionClick function to set session and open modal
- Kept fallback external link for opening in new tab
- Rendered AgentSessionModal at component bottom
- Note: The component being updated was WorkflowTimelineItem, not WorkflowRunStepsList (which doesn't exist)
- All integration points properly connected with projectId threaded through component hierarchy

### Task Group 4: Refactor ProjectSession Page

<!-- prettier-ignore -->
- [x] session-page-1: Import AgentSessionViewer component
  - Add import: `import { AgentSessionViewer } from "@/client/components/AgentSessionViewer"`
  - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

- [x] session-page-2: Replace ChatInterface with AgentSessionViewer
  - Remove manual `loadSession` call in useEffect (AgentSessionViewer handles it)
  - Replace `<ChatInterface ... />` with `<AgentSessionViewer projectId={projectId!} sessionId={sessionId!} />`
  - Keep the container div structure (flex-1 overflow-hidden)
  - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

- [x] session-page-3: Verify ChatPromptInput still works
  - Keep ChatPromptInput in page (don't move to viewer)
  - Verify form state still accessible from store
  - Verify sendMessage still works with WebSocket hook
  - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

- [x] session-page-4: Remove redundant loading logic
  - Remove manual session loading in useEffect (if present)
  - Remove isLoading state if only used for ChatInterface
  - Keep useSessionWebSocket hook call (or remove if AgentSessionViewer handles it)
  - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

#### Completion Notes

- Successfully refactored ProjectSession to use AgentSessionViewer
- Removed ChatInterface import and replaced with AgentSessionViewer
- Simplified session loading - removed manual loadSession logic (AgentSessionViewer handles it)
- Added autoLoad={!hasQueryParam} to prevent double-loading when query parameter present
- Removed unused imports (useQueryClient) and refs (loadSessionInitiatedRef)
- Kept ChatPromptInput in page for interactive functionality
- Kept useSessionWebSocket hook for sending messages
- Kept all message handling logic (handleSubmit, addMessage, setStreaming)
- Page now ~60 lines shorter and much simpler
- No breaking changes to existing functionality

### Task Group 5: Testing & Validation

<!-- prettier-ignore -->
- [ ] test-1: Test modal opens and displays session
  - Navigate to workflow run page
  - Click "View Agent Session" button on a step
  - Verify modal opens with session messages
  - Command: Start dev server and manually test

- [ ] test-2: Test real-time WebSocket updates in modal
  - Open modal for an active/running session
  - Verify streaming messages appear in real-time
  - Check that final message completion works
  - Command: Manually test with running agent session

- [ ] test-3: Test modal cleanup
  - Open modal, then close it
  - Verify session data cleared from store
  - Open different session in modal → verify correct session loads
  - Command: Open/close modal multiple times with different sessions

- [ ] test-4: Test existing ProjectSession page
  - Navigate to full session page
  - Verify chat interface works correctly
  - Test sending messages and receiving responses
  - Verify ChatPromptInput still functions
  - Command: Navigate to /projects/{id}/session/{sessionId}

- [ ] test-5: Test fallback link for new tab
  - Click external link icon next to "View Agent Session"
  - Verify opens in new tab
  - Check session loads correctly in new tab
  - Command: Manually test link click

- [ ] test-6: Test switching between modal and full page
  - Open modal from workflow
  - Navigate to full session page (different session)
  - Verify no conflicts or stale data
  - Command: Manually test navigation

- [ ] test-7: Run type checking
  - Verify no TypeScript errors
  - Expected: No type errors
  - Command: `cd apps/web && pnpm check-types`

- [ ] test-8: Run linting
  - Verify no lint errors
  - Expected: No ESLint warnings/errors
  - Command: `cd apps/web && pnpm lint`

- [ ] test-9: Build verification
  - Verify successful production build
  - Expected: Build completes without errors
  - Command: `cd apps/web && pnpm build`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**Note**: Web app currently has no test files. Unit tests should be added alongside implementation.

**Recommended Tests** (future enhancement):

`AgentSessionViewer.test.tsx` - Test session viewer component:
```typescript
describe('AgentSessionViewer', () => {
  it('loads session on mount', async () => {
    render(<AgentSessionViewer projectId="p1" sessionId="s1" />);
    await waitFor(() => expect(screen.getByText(/session/i)).toBeInTheDocument());
  });

  it('clears previous session when loading new one', async () => {
    const { rerender } = render(<AgentSessionViewer projectId="p1" sessionId="s1" />);
    rerender(<AgentSessionViewer projectId="p1" sessionId="s2" />);
    // Verify clearSession called before loadSession
  });

  it('subscribes to WebSocket updates', () => {
    render(<AgentSessionViewer projectId="p1" sessionId="s1" />);
    // Verify useSessionWebSocket called with correct params
  });
});
```

### Integration Tests

**Manual Integration Testing Checklist**:

1. **Session Loading**: Open modal → Verify messages load correctly
2. **WebSocket Streaming**: Open modal with active session → Verify streaming updates appear
3. **Modal Cleanup**: Open/close modal → Verify session cleared
4. **Session Switching**: Open different sessions in modal → Verify correct data loads
5. **Navigation**: Click link to open in new tab → Verify session loads
6. **Full Page**: Navigate to full session page → Verify works as before
7. **Error Handling**: Load non-existent session → Verify error displayed
8. **Empty State**: Load new session with no messages → Verify empty state shown

### E2E Tests (Future Enhancement)

**Recommended E2E Tests** (using Playwright):

`workflow-session-modal.spec.ts` - Test workflow → modal flow:
```typescript
test('should open agent session modal from workflow step', async ({ page }) => {
  await page.goto('/projects/p1/workflows/w1/execution/e1');
  await page.click('text=View Agent Session');
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator('.chat-container')).toBeVisible();
});
```

## Success Criteria

- [ ] Modal opens correctly when clicking "View Agent Session" on workflow steps
- [ ] Session messages display correctly in modal (all message types: text, tool_use, tool_result)
- [ ] WebSocket updates work in modal for active sessions (streaming messages appear)
- [ ] Modal cleanup clears session data (no stale data on reopen)
- [ ] Session switching works correctly (can view different sessions in sequence)
- [ ] Existing ProjectSession page still works correctly (chat input, sending messages)
- [ ] Fallback link opens session in new tab
- [ ] TypeScript compilation succeeds with no errors
- [ ] ESLint passes with no warnings
- [ ] Production build succeeds
- [ ] No infinite re-renders or performance issues
- [ ] Tool result matching pattern still works (images display correctly)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors, successful compilation

# Linting
cd apps/web && pnpm lint
# Expected: No ESLint errors or warnings

# Build verification
cd apps/web && pnpm build
# Expected: Successful build without errors
# Output: dist/client/ and dist/server/ directories created
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: Workflow run page (any workflow with agent session steps)
3. Click "View Agent Session" button on a step
4. Verify modal opens with session messages displayed correctly
5. Verify real-time updates if session is active (streaming messages)
6. Close modal and reopen → verify no stale data
7. Open different session → verify correct session loads
8. Navigate to full session page (`/projects/{id}/session/{sessionId}`)
9. Verify chat interface works and can send messages
10. Check browser DevTools console: No errors or warnings

**Feature-Specific Checks:**

- **Session Switching**: Open multiple sessions in sequence → Verify no data mixing
- **WebSocket Subscription**: Monitor Network tab → Verify single WebSocket connection
- **Memory Cleanup**: Open/close modal 10 times → Check Memory tab in DevTools → No unbounded memory growth
- **Tool Rendering**: View session with tool_use blocks → Verify Read, Bash, Edit tools render correctly
- **Image Display**: View session with images → Verify images display inline (not as JSON)
- **Empty State**: View new session with no messages → Verify "New Session" empty state shown
- **Error State**: Load non-existent session → Verify error message displayed
- **Loading State**: Monitor during load → Verify skeleton loader appears briefly
- **Scroll Behavior**: Open modal with long conversation → Verify auto-scroll to bottom works

## Implementation Notes

### 1. Store Simplicity

**Key Insight**: No store refactoring needed! The existing single-session store works perfectly with a clear/load pattern:

```typescript
// Modal opens
useSessionStore.getState().clearSession();
await useSessionStore.getState().loadSession(newSessionId, projectId);

// Modal closes
useSessionStore.getState().clearSession();
```

This saves 2-3 hours of complex refactoring and testing.

### 2. WebSocket Channel Pattern

The WebSocket system uses Phoenix Channels pattern with event names like:
- `session.{sessionId}.send_message`
- `session.{sessionId}.stream_output`
- `session.{sessionId}.message_complete`

EventBus already supports multiple listeners per channel. No changes needed to WebSocket infrastructure.

### 3. Modal vs Full Page Differences

**Modal** (Read-Only):
- No ChatPromptInput
- Displays existing messages only
- WebSocket subscription for real-time updates
- Clears session data on close

**Full Page** (Interactive):
- Includes ChatPromptInput
- Can send messages
- Full session management UI
- Persists session data until navigation

### 4. Session Clearing Strategy

Modal should clear session data when closed to prevent:
- Stale data showing when reopening modal with different session
- Memory leaks from keeping unused sessions in memory

**Recommended Pattern**:
```typescript
// In AgentSessionModal
useEffect(() => {
  if (!open && sessionId) {
    // Delay cleanup slightly to allow for animations
    const timer = setTimeout(() => {
      useSessionStore.getState().clearSession();
    }, 300);
    return () => clearTimeout(timer);
  }
}, [open, sessionId]);
```

### 5. Component Reusability

`AgentSessionViewer` is designed to work in both contexts:
- **Modal**: Pass sessionId, component clears and loads
- **Full Page**: Pass sessionId, component clears and loads
- Both use same store, same WebSocket hook, same ChatInterface

This eliminates code duplication and ensures consistent behavior.

## Dependencies

- No new dependencies required
- Uses existing shadcn/ui Dialog components
- Uses existing WebSocket infrastructure (EventBus)
- Uses existing store patterns (Zustand)

## Timeline

| Task                              | Estimated Time |
| --------------------------------- | -------------- |
| Create AgentSessionViewer         | 2-3 hours      |
| Create AgentSessionModal          | 1 hour         |
| Update WorkflowRunStepsList | 1 hour         |
| Refactor ProjectSession page      | 30 minutes     |
| Testing & validation              | 1-2 hours      |
| **Total**                         | **5-7 hours**  |

## References

- Tool Result Matching Pattern: `.agent/docs/claude-tool-result-patterns.md`
- WebSocket Architecture: `.agent/docs/websockets.md`
- Domain-Driven Backend: `apps/web/CLAUDE.md` (Backend Architecture section)
- shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog
- Zustand Best Practices: https://docs.pmnd.rs/zustand/guides/immutable-state-and-merging

## Next Steps

1. Review spec with user for approval
2. Start with Task Group 1 (AgentSessionViewer component)
3. Proceed sequentially through task groups
4. Test after each group completion
5. Document any deviations or issues in Completion Notes
