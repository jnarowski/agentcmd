# Session Debugging Tools

**Status**: draft
**Created**: 2025-01-25
**Package**: apps/web (frontend + backend integration)
**Total Complexity**: 53 points
**Phases**: 3
**Tasks**: 11
**Overall Avg Complexity**: 4.8/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Type System & Metadata | 3 | 14 | 4.7/10 | 6/10 |
| Phase 2: UI Controls & Copy/Export | 4 | 23 | 5.8/10 | 7/10 |
| Phase 3: Enhanced Logging & Debugging | 4 | 16 | 4.0/10 | 5/10 |
| **Total** | **11** | **53** | **4.8/10** | **7/10** |

## Overview

Add comprehensive debugging tools to diagnose blank message renders and tool result relationship issues in session streaming. Provides JSON export, inline JSON viewers, flattened metadata access, enhanced logging, and DOM-to-data mapping for quick investigation.

## User Story

As a developer debugging message streaming
I want to quickly inspect message JSON, track parentId relationships, and see why messages render blank
So that I can diagnose UI rendering issues and tool result mismatches without manual data extraction

## Technical Approach

Minimal UI additions focused on data accessibility:
1. **Flatten critical metadata** (`parentId`, `sessionId`) to UIMessage top-level for easy access
2. **Pass-through SDK _original** directly from agent-cli-sdk without nesting
3. **Add copy/expand controls** on messages (dev mode only) for on-demand JSON inspection
4. **Copy session button** in SessionHeader to get full session state
5. **Enhanced logging** in enrichment to track filtering, orphaned tool results, empty content
6. **Enhanced data attributes** to map DOM elements to message data
7. **Blank render logging** before components return null

## Key Design Decisions

1. **Flatten Only Critical Fields**: Only `parentId` and `sessionId` moved to top-level; other metadata stays nested in `_original`
2. **Direct _original Pass-Through**: Store SDK's ClaudeEvent directly as `_original`, not nested UnifiedMessage (simpler access: `message._original.parentUuid` instead of `message._original._original.parentUuid`)
3. **Dev Mode Only UI**: Copy/expand buttons only visible when `import.meta.env.DEV` to keep production UI clean
4. **Copy Not Download**: Use clipboard API instead of file downloads for faster workflow
5. **On-Demand JSON**: Expand button shows JSON inline; automatic debug rendering removed

## Architecture

### File Structure
```
apps/web/src/
├── shared/types/
│   └── message.types.ts                   # Add parentId, sessionId; change _original type
├── client/
│   ├── components/
│   │   └── SessionHeader.tsx              # Add copy session button
│   └── pages/projects/sessions/
│       ├── stores/
│       │   └── sessionStore.ts            # Populate flattened fields, enhanced logging
│       ├── components/session/
│       │   └── claude/
│       │       ├── MessageRenderer.tsx    # Add expand/copy buttons, data attributes
│       │       ├── UserMessage.tsx        # Log before returning null
│       │       └── AssistantMessage.tsx   # Log before returning null
│       └── utils/
│           └── copySessionToClipboard.ts  # NEW: Generate + copy session JSON
```

### Integration Points

**Type System**:
- `apps/web/src/shared/types/message.types.ts` - UIMessage interface extension

**Session Store**:
- `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - loadSession, updateStreamingMessage, finalizeMessage, enrichMessagesWithToolResults

**Components**:
- `apps/web/src/client/components/SessionHeader.tsx` - Header with agent icon, session name
- `apps/web/src/client/pages/projects/sessions/components/session/claude/MessageRenderer.tsx` - Dispatcher to User/AssistantMessage
- `apps/web/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx` - User message with border box
- `apps/web/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx` - Assistant message with content blocks

## Implementation Details

### 1. Flattened Metadata Fields

Add `parentId` and `sessionId` to UIMessage for easy access to Claude's parent/child relationships.

**Key Points**:
- Only flatten fields critical for debugging relationships
- Other metadata stays in `_original` for rare access
- TypeScript types updated for autocomplete

### 2. Direct _original Pass-Through

Change `_original` from nested UnifiedMessage to direct ClaudeEvent pass-through.

**Key Points**:
- Current: `message._original._original.parentUuid` (double nested)
- New: `message._original.parentUuid` (direct access)
- Simplifies access patterns throughout codebase
- Loses pre-enrichment snapshot (acceptable tradeoff)

### 3. Copy Session JSON Button

Add copy icon button in SessionHeader (dev mode only) to copy full session state.

**Key Points**:
- Positioned next to SessionDropdownMenu
- Uses `navigator.clipboard.writeText`
- Formatted JSON with 2-space indent
- Includes all messages, session metadata, enrichment stats
- Toast notification: "Session JSON copied to clipboard"

### 4. Per-Message Debug Controls

Add expand/copy buttons to each message for inline JSON inspection.

**Key Points**:
- Only visible in dev mode
- Two buttons positioned top-right of message container
- Expand button toggles inline JSON viewer (collapsible)
- Copy button copies message JSON to clipboard
- Syntax highlighting in inline viewer
- Toast notification on copy

### 5. Enhanced Data Attributes

Add data attributes to MessageRenderer for DOM-to-data mapping.

**Key Points**:
- `data-has-empty-content`: Boolean if content.length === 0
- `data-parent-id`: Message parentId or 'none'
- `data-session-id`: Message sessionId or 'none'
- `data-filtered-tool-results`: Count of filtered tool_result blocks
- Visible in DevTools when inspecting blank divs

### 6. Enhanced Enrichment Logging

Add console logging in `enrichMessagesWithToolResults` to track filtering.

**Key Points**:
- `[ENRICH] Tool_result {tool_use_id} - no matching tool_use`
- `[ENRICH] Message {id} filtered - {reason}` (only tool_result, empty content, system tags)
- `[ENRICH] Message {id} has {N} blocks, {M} empty`
- `[ENRICH] {N} messages → {M} after enrichment ({X} filtered)`
- Prefix with `[ENRICH]` for easy grep

### 7. Blank Message Detection Logging

Log before UserMessage/AssistantMessage returns null.

**Key Points**:
- `[RENDER] Message {id} renders blank - role: {role}, content.length: {N}, blocks: {types}, parentId: {parentId}`
- Prefix with `[RENDER]` for easy grep
- Includes role, content length, block types, parentId for context

## Files to Create/Modify

### New Files (1)

1. `apps/web/src/client/pages/projects/sessions/utils/copySessionToClipboard.ts` - Session JSON generation and clipboard copy

### Modified Files (6)

1. `apps/web/src/shared/types/message.types.ts` - Add parentId, sessionId, change _original type
2. `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - Populate flattened fields, enhanced logging
3. `apps/web/src/client/components/SessionHeader.tsx` - Add copy session button
4. `apps/web/src/client/pages/projects/sessions/components/session/claude/MessageRenderer.tsx` - Add expand/copy buttons, data attributes
5. `apps/web/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx` - Log before returning null
6. `apps/web/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx` - Log before returning null

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Type System & Metadata

**Phase Complexity**: 14 points (avg 4.7/10)

<!-- prettier-ignore -->
- [ ] 1.1 [4/10] Update UIMessage type definition
  - Add `parentId?: string | null` field
  - Add `sessionId?: string` field
  - Change `_original?: UnifiedMessage` to `_original?: unknown`
  - File: `apps/web/src/shared/types/message.types.ts`
- [ ] 1.2 [6/10] Extract and populate flattened fields in loadSession
  - After SDK returns messages, extract `parentId` from `message._original?.parentUuid`
  - Extract `sessionId` from `message._original?.sessionId`
  - Store `message._original` directly (not nested UnifiedMessage)
  - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` (loadSession action)
- [ ] 1.3 [4/10] Extract and populate flattened fields in streaming
  - In `updateStreamingMessage`, extract parentId and sessionId when creating new message
  - Pass through `_original` from SDK message
  - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` (updateStreamingMessage action)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: UI Controls & Copy/Export

**Phase Complexity**: 23 points (avg 5.8/10)

<!-- prettier-ignore -->
- [ ] 2.1 [7/10] Create copySessionToClipboard utility
  - Function accepts session store state
  - Generates formatted JSON with: messages (all UIMessage fields), session metadata (id, agent, state, project), enrichment stats (before/after counts)
  - Pretty-prints with 2-space indent
  - Copies to clipboard via `navigator.clipboard.writeText`
  - Returns promise for toast handling
  - File: `apps/web/src/client/pages/projects/sessions/utils/copySessionToClipboard.ts`
- [ ] 2.2 [5/10] Add copy session button to SessionHeader
  - Import Copy icon from lucide-react
  - Add icon button next to SessionDropdownMenu
  - Only render if `import.meta.env.DEV`
  - Call copySessionToClipboard util on click
  - Show toast: "Session JSON copied to clipboard"
  - File: `apps/web/src/client/components/SessionHeader.tsx`
- [ ] 2.3 [6/10] Add per-message expand/copy controls to MessageRenderer
  - Import ChevronDown, ChevronRight, Copy icons
  - Add state for isJsonExpanded per message
  - Add two icon buttons positioned top-right of message container (dev mode only)
  - Expand button toggles inline JSON viewer (collapsible pre/code block with syntax)
  - Copy button copies message JSON via `navigator.clipboard.writeText`
  - Toast: "Message JSON copied to clipboard"
  - Remove automatic debug rendering (existing `?debug=true` behavior)
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/MessageRenderer.tsx`
- [ ] 2.4 [5/10] Add enhanced data attributes to MessageRenderer
  - Add `data-has-empty-content={Array.isArray(message.content) && message.content.length === 0}`
  - Add `data-parent-id={message.parentId || 'none'}`
  - Add `data-session-id={message.sessionId || 'none'}`
  - Track filtered tool_result count during render and add `data-filtered-tool-results={count}`
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/MessageRenderer.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Enhanced Logging & Debugging

**Phase Complexity**: 16 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] 3.1 [5/10] Add enhanced logging to enrichMessagesWithToolResults
  - Log orphaned tool_results: `[ENRICH] Tool_result {tool_use_id} - no matching tool_use`
  - Log filtered messages: `[ENRICH] Message {id} filtered - {reason}` (reasons: only tool_result, empty content, system tags)
  - Log empty blocks: `[ENRICH] Message {id} has {N} blocks, {M} empty`
  - Summary: `[ENRICH] {N} messages → {M} after enrichment ({X} filtered)`
  - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
- [ ] 3.2 [3/10] Add blank render logging to UserMessage
  - Before returning null (line 60), log: `[RENDER] Message {id} renders blank - role: user, content.length: {N}, blocks: {types}, parentId: {parentId}`
  - Include role, content.length, block types array, parentId
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx`
- [ ] 3.3 [4/10] Add blank render logging to AssistantMessage
  - Before returning null (line 104 in debug box branch), log: `[RENDER] Message {id} renders blank - role: assistant, content.length: {N}, blocks: {types}, parentId: {parentId}`
  - Include role, content.length, block types array, parentId
  - Note: AssistantMessage already has debug box for empty messages, keep that functionality
  - File: `apps/web/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx`
- [ ] 3.4 [4/10] Test debug workflow end-to-end
  - Start dev server with existing session containing blank messages
  - Verify console logs show `[ENRICH]` and `[RENDER]` prefixes
  - Inspect blank div in DevTools → check data attributes present
  - Click expand button on message → verify JSON viewer shows parentId, sessionId
  - Click copy button on message → verify clipboard has JSON
  - Click copy session button in header → verify clipboard has full session
  - Manual test, no code changes

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No unit tests required - debugging utilities are dev-mode only and tested manually.

### Manual Testing

**Test Scenario 1: Blank Message Investigation**

1. Load session with blank message renders
2. Open browser DevTools > Console
3. Check for `[ENRICH]` logs showing filtering reasons
4. Check for `[RENDER]` logs showing blank render reasons
5. Inspect blank div in Elements tab
6. Verify data attributes: `data-message-id`, `data-parent-id`, `data-has-empty-content`
7. Click expand button on nearby message
8. Verify JSON viewer shows parentId, sessionId, full content
9. Click copy button → verify JSON in clipboard
10. Click copy session button in header → verify full session JSON in clipboard

**Test Scenario 2: Tool Result Mismatch**

1. Load session with orphaned tool_result
2. Open Console
3. Check for `[ENRICH] Tool_result {id} - no matching tool_use`
4. Expand message JSON → verify tool_use_id doesn't match any tool_use.id
5. Copy session JSON → search for tool_use_id to confirm mismatch

**Test Scenario 3: ParentId Relationship Tracking**

1. Load multi-turn session
2. Expand multiple messages
3. Verify `parentId` field links messages correctly
4. Check `sessionId` matches across all messages in session

## Success Criteria

- [ ] UIMessage type has `parentId`, `sessionId` flattened fields
- [ ] `_original` is direct pass-through from SDK (not nested)
- [ ] Copy session button visible in dev mode only
- [ ] Clicking copy session button copies formatted JSON to clipboard
- [ ] Toast notification shows "Session JSON copied to clipboard"
- [ ] Per-message expand/copy buttons visible in dev mode only
- [ ] Expand button toggles inline JSON viewer
- [ ] Copy button copies message JSON to clipboard
- [ ] Data attributes added to MessageRenderer: `data-has-empty-content`, `data-parent-id`, `data-session-id`, `data-filtered-tool-results`
- [ ] Enhanced logging in enrichment shows orphaned tool_results, filtered messages, empty blocks, summary
- [ ] Blank render logging before null return in UserMessage and AssistantMessage
- [ ] Console logs prefixed with `[ENRICH]` and `[RENDER]` for easy filtering
- [ ] Manual testing confirms debug workflow works end-to-end

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
cd apps/web && pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173` and login
3. Open existing session with messages
4. Verify: Copy session button visible in header (dev mode only)
5. Verify: Expand/copy buttons visible on each message (dev mode only)
6. Test: Click copy session → check clipboard has JSON
7. Test: Click expand message → verify JSON viewer appears
8. Test: Click copy message → check clipboard has message JSON
9. Test: Inspect blank message div → check data attributes present
10. Check console: Verify `[ENRICH]` and `[RENDER]` logs present

**Feature-Specific Checks:**

- Open DevTools Console before loading session
- Filter logs by `[ENRICH]` to see enrichment process
- Filter logs by `[RENDER]` to see blank render reasons
- Inspect DOM elements with DevTools > Elements
- Hover over data attributes to see values
- Copy JSON and paste into editor to verify formatting
- Check `parentId` matches between related messages
- Verify `sessionId` is consistent across session messages

## Implementation Notes

### 1. ClaudeEvent Type from SDK

The `_original` field will contain `ClaudeEvent` from agent-cli-sdk. Access SDK types:

```typescript
import type { ClaudeEvent } from 'agent-cli-sdk';

// In message.types.ts, optionally type it:
_original?: ClaudeEvent | unknown; // or just unknown for flexibility
```

### 2. Clipboard API Usage

Modern browsers require HTTPS or localhost for `navigator.clipboard`. Dev mode uses localhost so this works. Handle errors gracefully:

```typescript
try {
  await navigator.clipboard.writeText(json);
  toast.success('Copied!');
} catch (err) {
  console.error('Clipboard access denied:', err);
  toast.error('Failed to copy');
}
```

### 3. Dev Mode Check

Use Vite's environment variable:

```typescript
{import.meta.env.DEV && (
  <button>Copy Session</button>
)}
```

### 4. Existing Debug Infrastructure

MessageRenderer already has debug mode with `useDebugMode()` hook and automatic JSON rendering. We're replacing automatic rendering with on-demand expand button for cleaner UX.

## Dependencies

- lucide-react (already installed) - Icons for copy/expand buttons
- React hooks (useState) - State for expand/collapse
- navigator.clipboard API - Built-in browser API
- Toast notifications (existing) - Feedback for copy actions

## References

- Previous research: Agent tool for comprehensive message flow analysis
- Existing debug panel: `apps/web/src/client/pages/projects/sessions/components/session/DebugMessagePanel.tsx`
- Tool result pattern: `.agent/docs/claude-tool-result-patterns.md`
- agent-cli-sdk types: `packages/agent-cli-sdk/src/types/unified.types.ts`

## Next Steps

1. Update UIMessage type with flattened fields
2. Modify sessionStore to populate parentId/sessionId
3. Add copy session button to SessionHeader
4. Add expand/copy controls to MessageRenderer
5. Add enhanced logging throughout
6. Test full debug workflow manually
