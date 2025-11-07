# Debug Panel Consolidation & Revamp

**Status**: draft
**Created**: 2025-01-07
**Package**: apps/web
**Total Complexity**: 62 points
**Phases**: 4
**Tasks**: 14
**Overall Avg Complexity**: 4.4/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Core Infrastructure | 3 | 15 | 5.0/10 | 6/10 |
| Phase 2: Tab Implementations | 4 | 23 | 5.8/10 | 7/10 |
| Phase 3: Integration & Cleanup | 4 | 17 | 4.3/10 | 6/10 |
| Phase 4: Testing & Refinement | 3 | 7 | 2.3/10 | 3/10 |
| **Total** | **14** | **62** | **4.4/10** | **7/10** |

## Overview

Consolidate two existing debug panels (WebSocketDevTools and DebugMessagePanel) into a unified DebugPanel component with three tabs: WebSocket, Messages, and Store. Activated via `?debug=true` query parameter with Ctrl+Shift+W keyboard shortcut. Provides developers with a single, cohesive debugging interface for WebSocket diagnostics, message structure inspection, and Zustand state monitoring.

## User Story

As a developer debugging the web application
I want a single consolidated debug panel with tabbed access to WebSocket, Messages, and Store diagnostics
So that I can efficiently troubleshoot issues without managing multiple floating panels and have quick access to real-time state inspection

## Technical Approach

Create a new `DebugPanel` component that replaces both existing debug tools. Use a simple tabbed interface with three hardcoded tabs (no plugin registry for simplicity). Each tab reads from global data sources: wsMetrics singleton (WebSocket), sessionStore (Messages), and all Zustand stores (Store tab). The Messages tab will be page-reactive, showing "No active session" when not on a session page. Panel activates via existing `useDebugMode()` hook and supports the same Ctrl+Shift+W keyboard shortcut.

## Key Design Decisions

1. **No Plugin Registry**: Hardcode 3 tabs for simplicity - extensibility can be added later if needed
2. **Keep wsMetrics Singleton**: Import directly rather than refactoring into context (minimize changes)
3. **Page-Reactive Messages Tab**: Read from `sessionStore.currentSession.messages` to show context-aware data
4. **Custom Store Inspector**: Build lightweight viewer instead of using external devtools (zero dependencies, works anywhere)
5. **Fixed Panel Size**: 700x600px, bottom-right, no resize/persistence features (start simple)

## Architecture

### File Structure
```
apps/web/src/client/
├── components/
│   └── debug/                          # New debug panel directory
│       ├── DebugPanel.tsx             # Main container component
│       ├── types.ts                   # Shared type definitions
│       └── tabs/                      # Tab implementations
│           ├── WebSocketTab.tsx       # WebSocket diagnostics
│           ├── MessagesTab.tsx        # Message structure inspector
│           └── StoreTab.tsx           # Zustand state viewer
│
├── App.tsx                            # Mount point (line 68)
└── pages/projects/sessions/components/session/
    └── MessageList.tsx                # Remove DebugMessagePanel usage
```

### Integration Points

**Global App**:
- `App.tsx` - Replace `<WebSocketDevTools />` with `<DebugPanel />` (line 68)

**Session Feature**:
- `MessageList.tsx` - Remove `<DebugMessagePanel messages={messages} />` usage

**Shared Utilities**:
- `hooks/useDebugMode.ts` - Reuse existing activation hook
- `utils/WebSocketMetrics.ts` - Import wsMetrics singleton directly

## Implementation Details

### 1. DebugPanel Component

Main container component that manages tab state, keyboard shortcuts, and activation logic.

**Key Points**:
- Fixed positioning: `fixed bottom-4 right-4 z-50`
- Size: `w-[700px] h-[600px]`
- Dark theme: `bg-gray-900 text-white`
- Minimized state shows "Debug Tools" button with tab count
- Expanded state shows tabbed interface with header
- Keyboard shortcut: Ctrl+Shift+W (Cmd+Shift+W on Mac)
- Remember active tab in sessionStorage (`debug-panel-active-tab`)
- Only render when `useDebugMode()` returns true

### 2. WebSocketTab Component

Streamlined version of existing WebSocketDevTools metrics and message logging.

**Key Points**:
- Import `wsMetrics` singleton directly (no refactoring)
- Show connection status indicator (connected/disconnected)
- Display last 20 messages (reduced from 50) with channel filter
- List active subscriptions from `eventBus.getActiveChannels()`
- Remove separate metrics tab and latency graph (over-engineered)
- Single scrollable view with collapsible sections
- Manual reconnect button

### 3. MessagesTab Component

Page-reactive message structure inspector based on DebugMessagePanel.

**Key Points**:
- Read from `sessionStore.currentSession.messages` (no prop drilling)
- Show "No active session" message when `currentSession` is null
- Keep problem detection: highlight empty content arrays, empty text blocks
- Display message statistics, content block breakdown, raw JSON viewer
- Add quick filters: "Errors Only", "Tool Uses", "Streaming"
- Copy individual message JSON to clipboard
- Collapsible accordion for each message

### 4. StoreTab Component

Custom lightweight Zustand state viewer with live updates.

**Key Points**:
- Subscribe to all stores: `sessionStore`, `filesStore`, `authStore`, `navigationStore`
- Use `useStore.subscribe()` for automatic re-renders on state changes
- Display each store as expandable accordion section
- Show formatted JSON tree per store (use `<pre>` with JSON.stringify)
- Copy button to copy store state to clipboard
- No reset/clear actions (keep simple for v1)
- No time travel or action logs (lightweight approach)

## Files to Create/Modify

### New Files (5)

1. `apps/web/src/client/components/debug/DebugPanel.tsx` - Main debug panel container
2. `apps/web/src/client/components/debug/types.ts` - Shared type definitions
3. `apps/web/src/client/components/debug/tabs/WebSocketTab.tsx` - WebSocket diagnostics tab
4. `apps/web/src/client/components/debug/tabs/MessagesTab.tsx` - Message inspector tab
5. `apps/web/src/client/components/debug/tabs/StoreTab.tsx` - Zustand state viewer tab

### Modified Files (2)

1. `apps/web/src/client/App.tsx` - Replace WebSocketDevTools import and component (line 4, 68)
2. `apps/web/src/client/pages/projects/sessions/components/session/MessageList.tsx` - Remove DebugMessagePanel import and usage

### Deleted Files (2)

1. `apps/web/src/client/components/WebSocketDevTools.tsx` - Replaced by DebugPanel
2. `apps/web/src/client/pages/projects/sessions/components/session/DebugMessagePanel.tsx` - Replaced by DebugPanel

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Core Infrastructure

**Phase Complexity**: 15 points (avg 5.0/10)

<!-- prettier-ignore -->
- [ ] c9j-001 [4/10] Create debug panel directory structure and types file
  - Create `apps/web/src/client/components/debug/` directory
  - Create `types.ts` with minimal tab interfaces
  - File: `apps/web/src/client/components/debug/types.ts`
  ```bash
  mkdir -p apps/web/src/client/components/debug/tabs
  ```

- [ ] c9j-002 [6/10] Build main DebugPanel container component
  - Create tabbed interface with header, tab switcher, content area
  - Implement minimize/expand state management
  - Add keyboard shortcut handler (Ctrl+Shift+W)
  - Integrate `useDebugMode()` hook for activation
  - Store active tab in sessionStorage
  - Fixed positioning and sizing (700x600px, bottom-right)
  - File: `apps/web/src/client/components/debug/DebugPanel.tsx`

- [ ] c9j-003 [5/10] Create tabs directory and stub components
  - Create empty tab components with basic structure
  - Export placeholder content for each tab
  - Files:
    - `apps/web/src/client/components/debug/tabs/WebSocketTab.tsx`
    - `apps/web/src/client/components/debug/tabs/MessagesTab.tsx`
    - `apps/web/src/client/components/debug/tabs/StoreTab.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Tab Implementations

**Phase Complexity**: 23 points (avg 5.8/10)

<!-- prettier-ignore -->
- [ ] c9j-004 [5/10] Implement WebSocketTab with streamlined metrics
  - Import `wsMetrics` singleton and `useWebSocket` hook
  - Display connection status indicator
  - Show last 20 messages with channel filter input
  - List active subscriptions from eventBus
  - Add reconnect button
  - Single scrollable view with collapsible sections (no separate metrics tab)
  - File: `apps/web/src/client/components/debug/tabs/WebSocketTab.tsx`

- [ ] c9j-005 [7/10] Implement MessagesTab with page-reactive data
  - Subscribe to `sessionStore.currentSession.messages`
  - Show "No active session" when currentSession is null
  - Migrate problem detection logic from DebugMessagePanel
  - Display message statistics (total, streaming, tool uses, empty blocks)
  - Add quick filters: errors only, tool uses only, streaming only
  - Collapsible accordion for each message with content breakdown
  - Copy message JSON button
  - File: `apps/web/src/client/components/debug/tabs/MessagesTab.tsx`

- [ ] c9j-006 [6/10] Implement StoreTab with live Zustand inspection
  - Import all stores: sessionStore, filesStore, authStore, navigationStore
  - Subscribe to stores for automatic re-renders
  - Display each store as expandable accordion section
  - Format state as JSON tree using `<pre>` and `JSON.stringify(state, null, 2)`
  - Add copy button for each store's state
  - Handle null/undefined gracefully
  - File: `apps/web/src/client/components/debug/tabs/StoreTab.tsx`

- [ ] c9j-007 [5/10] Style and polish all tabs consistently
  - Apply consistent dark theme (gray-900 background, white text)
  - Add proper spacing, borders, rounded corners
  - Implement collapsible sections with smooth transitions
  - Add hover states for interactive elements
  - Ensure text is readable with proper contrast
  - Make scrollable content areas work smoothly
  - Files: All tab components

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Integration & Cleanup

**Phase Complexity**: 17 points (avg 4.3/10)

<!-- prettier-ignore -->
- [ ] c9j-008 [6/10] Integrate DebugPanel into App.tsx
  - Replace `WebSocketDevTools` import with `DebugPanel`
  - Update component mount at line 68
  - Verify `?debug=true` activation works
  - Test keyboard shortcut (Ctrl+Shift+W)
  - File: `apps/web/src/client/App.tsx`
  ```diff
  - import { WebSocketDevTools } from "@/client/components/WebSocketDevTools";
  + import { DebugPanel } from "@/client/components/debug/DebugPanel";

  - <WebSocketDevTools />
  + <DebugPanel />
  ```

- [ ] c9j-009 [4/10] Remove DebugMessagePanel from MessageList
  - Remove import statement for DebugMessagePanel
  - Remove component usage and props passing
  - File: `apps/web/src/client/pages/projects/sessions/components/session/MessageList.tsx`

- [ ] c9j-010 [4/10] Delete old debug panel files
  - Remove WebSocketDevTools component file
  - Remove DebugMessagePanel component file
  - Files to delete:
    - `apps/web/src/client/components/WebSocketDevTools.tsx`
    - `apps/web/src/client/pages/projects/sessions/components/session/DebugMessagePanel.tsx`
  ```bash
  rm apps/web/src/client/components/WebSocketDevTools.tsx
  rm apps/web/src/client/pages/projects/sessions/components/session/DebugMessagePanel.tsx
  ```

- [ ] c9j-011 [3/10] Verify no broken imports or references
  - Search codebase for any remaining references to deleted files
  - Check TypeScript compilation succeeds
  - Verify no ESLint errors related to changes
  ```bash
  pnpm check-types
  pnpm lint
  ```

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Testing & Refinement

**Phase Complexity**: 7 points (avg 2.3/10)

<!-- prettier-ignore -->
- [ ] c9j-012 [3/10] Manual testing of all tabs and features
  - Test WebSocket tab: verify messages appear, connection status updates
  - Test Messages tab: verify shows data on session page, "No active session" elsewhere
  - Test Store tab: verify all stores display, copy buttons work
  - Test keyboard shortcut (Ctrl+Shift+W) toggles panel
  - Test minimize/expand state transitions
  - Test tab switching and sessionStorage persistence

- [ ] c9j-013 [2/10] Cross-browser and responsive testing
  - Test in Chrome, Firefox, Safari
  - Verify panel doesn't overflow on smaller screens
  - Check keyboard shortcut works on Mac (Cmd+Shift+W)
  - Ensure z-index doesn't conflict with other UI elements

- [ ] c9j-014 [2/10] Documentation and final polish
  - Add JSDoc comments to DebugPanel and tab components
  - Update any relevant documentation about debugging features
  - Take screenshots for future reference
  - Verify clean git diff (no unintended changes)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No unit tests required for this feature (primarily UI refactoring with manual testing).

### Integration Tests

Manual integration testing covers:
- Panel activation via `?debug=true` query parameter
- Keyboard shortcut functionality
- Tab switching and state persistence
- Data flow from stores to UI
- WebSocket metrics tracking
- Message inspection on session pages

### E2E Tests (Not Required)

This is a developer-only debug feature, no E2E tests needed.

## Success Criteria

- [ ] Single DebugPanel component replaces both WebSocketDevTools and DebugMessagePanel
- [ ] Panel activates via `?debug=true` query parameter
- [ ] Keyboard shortcut Ctrl+Shift+W (Cmd+Shift+W on Mac) toggles panel
- [ ] WebSocket tab shows connection status, recent messages, and subscriptions
- [ ] Messages tab shows current session messages with problem detection
- [ ] Messages tab displays "No active session" when not on session page
- [ ] Store tab shows all Zustand stores with live updates
- [ ] Copy to clipboard works for messages and store state
- [ ] Active tab persists in sessionStorage across page navigation
- [ ] Panel has consistent dark theme styling
- [ ] No TypeScript or ESLint errors
- [ ] Old debug panel files successfully deleted
- [ ] No broken imports or references remain

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects`
3. Add query parameter: `?debug=true`
4. Verify: DebugPanel button appears in bottom-right corner
5. Click button to expand panel
6. Verify: Panel shows with 3 tabs (WebSocket, Messages, Store)
7. Test WebSocket tab:
   - Check connection status indicator
   - Verify messages appear when WebSocket activity occurs
   - Test channel filter input
   - Verify subscriptions list displays
8. Navigate to a session page
9. Test Messages tab:
   - Verify current session messages display
   - Check problem detection highlights empty blocks
   - Test quick filters (errors, tool uses, streaming)
   - Verify copy message JSON works
10. Navigate away from session page
11. Test Messages tab: Verify "No active session" message displays
12. Test Store tab:
    - Verify all 4 stores display (session, files, auth, navigation)
    - Check JSON formatting is readable
    - Test copy store state buttons
    - Make a state change (e.g., navigate) and verify store updates
13. Test keyboard shortcut: Press Ctrl+Shift+W (or Cmd+Shift+W on Mac)
14. Verify: Panel toggles open/close
15. Switch tabs and refresh page
16. Verify: Last active tab is remembered (sessionStorage)
17. Check console: No errors or warnings

**Feature-Specific Checks:**

- WebSocket tab reconnect button works
- Messages tab filters correctly show/hide messages
- Store tab shows real-time updates when state changes
- Panel minimize button works correctly
- Panel doesn't visually conflict with other UI elements
- Dark theme is consistent across all tabs

## Implementation Notes

### 1. Message Interception for WebSocket Tab

The WebSocket tab needs to intercept messages for logging. Use the same pattern from old WebSocketDevTools:

```typescript
// Store original emit to intercept
const originalEmit = eventBus.emit.bind(eventBus);

// Override emit to log messages
eventBus.emit = (channel: string, event: ChannelEvent) => {
  // Log message
  messageLog.push({ channel, event, timestamp: Date.now() });

  // Call original emit
  return originalEmit(channel, event);
};

// Cleanup on unmount
return () => {
  eventBus.emit = originalEmit;
};
```

### 2. Store Subscription Pattern

For StoreTab, use Zustand's subscribe API for automatic re-renders:

```typescript
import { useSessionStore } from '@/client/pages/projects/sessions/stores/sessionStore';
import { useFilesStore } from '@/client/pages/projects/files/stores/filesStore';
import { useAuthStore } from '@/client/stores/authStore';
import { useNavigationStore } from '@/client/stores/navigationStore';

// Subscribe to all stores
const sessionState = useSessionStore();
const filesState = useFilesStore();
const authState = useAuthStore();
const navState = useNavigationStore();

// Stores auto-update when state changes
```

### 3. SessionStorage Key

Use consistent key for active tab persistence:

```typescript
const STORAGE_KEY = 'debug-panel-active-tab';

// Save
sessionStorage.setItem(STORAGE_KEY, activeTab);

// Load
const savedTab = sessionStorage.getItem(STORAGE_KEY) || 'websocket';
```

## Dependencies

- No new dependencies required
- Reuses existing utilities:
  - `hooks/useDebugMode.ts`
  - `utils/WebSocketMetrics.ts` (wsMetrics singleton)
  - All existing Zustand stores

## References

- Current WebSocketDevTools: `apps/web/src/client/components/WebSocketDevTools.tsx`
- Current DebugMessagePanel: `apps/web/src/client/pages/projects/sessions/components/session/DebugMessagePanel.tsx`
- useDebugMode hook: `apps/web/src/client/hooks/useDebugMode.ts`
- WebSocketMetrics singleton: `apps/web/src/client/utils/WebSocketMetrics.ts`
- SessionStore: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`

## Next Steps

1. Create debug panel directory structure
2. Build main DebugPanel container with tabs
3. Implement WebSocketTab with streamlined metrics
4. Implement MessagesTab with page-reactive data
5. Implement StoreTab with live Zustand inspection
6. Integrate into App.tsx and remove old panels
7. Test all features manually across tabs
8. Verify no TypeScript/ESLint errors
