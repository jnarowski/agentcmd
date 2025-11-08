# Permission Approval via Resume Pattern

**Status**: draft
**Created**: 2025-01-08
**Package**: apps/app (frontend only)
**Total Complexity**: 23 points
**Phases**: 3
**Tasks**: 9
**Overall Avg Complexity**: 2.6/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Detection & State | 3 | 8 | 2.7/10 | 4/10 |
| Phase 2: UI Rendering | 3 | 8 | 2.7/10 | 4/10 |
| Phase 3: Approval Flow | 3 | 7 | 2.3/10 | 3/10 |
| **Total** | **9** | **23** | **2.6/10** | **4/10** |

## Overview

Allow users to approve file edits and bash operations inline in the chat interface when using `default` permission mode. When Claude requests permission, show approve/deny buttons in the message block. On approval, automatically resume the session with `acceptEdits` mode to complete the operation.

## User Story

As a user running Claude with default permission mode
I want to see inline approve/deny buttons when permission is needed
So that I can review and approve file edits without the session hanging

## Technical Approach

Leverage the tested resume pattern: detect permission denials in tool_result blocks, render inline approval UI, and on approve send a follow-up message with `permissionMode: 'acceptEdits'`. No backend or SDK changes needed since resume already works for follow-up messages.

## Key Design Decisions

1. **Inline UI over dialog**: Buttons appear directly in the message flow, not in a separate modal, for better context
2. **Resume pattern**: Use existing session resume mechanism (already working) instead of bidirectional stdin
3. **Frontend-only**: No backend/SDK changes needed since permission mode can be overridden per message
4. **Detection in enrichment**: Identify permission denials during message enrichment phase for clean separation

## Architecture

### File Structure
```
apps/app/src/client/pages/projects/sessions/
├── stores/
│   └── sessionStore.ts              # Add handledPermissions state
├── components/
│   └── session/
│       └── claude/
│           ├── tools/
│           │   └── ToolResultRenderer.tsx  # Add permission denial rendering
│           └── blocks/
│               └── PermissionDenialBlock.tsx  # NEW: Inline approval UI
└── ProjectSession.tsx               # Update handleSubmit for override
```

### Integration Points

**sessionStore.ts**:
- Add `handledPermissions: Set<string>` to track processed approvals
- Add `markPermissionHandled()` action
- Add `clearHandledPermissions()` action

**ToolResultRenderer.tsx**:
- Detect `is_error: true` + "requested permissions" in content
- Extract tool details (file path, operation) from linked tool_use
- Render PermissionDenialBlock instead of regular error display

**ProjectSession.tsx**:
- Update `handleSubmit()` to accept `permissionModeOverride` option
- Wire approval handler to call `handleSubmit()` with override

## Implementation Details

### 1. Permission Denial Detection

Messages are already enriched via `enrichMessagesWithToolResults()` which nests tool_result into tool_use blocks. We detect permission denials by checking:
- `result.is_error === true`
- `result.content.includes('requested permissions')`

**Key Points**:
- Detection happens in ToolResultRenderer when rendering tool results
- Permission details extracted from parent tool_use block
- File path, operation type, and change details available from tool_use.input

### 2. Inline Approval UI

PermissionDenialBlock renders inline with the message, showing:
- Warning icon and "Permission required" header
- File path being modified
- Collapsible diff (for Edit operations showing old_string → new_string)
- Approve and Deny buttons

**Key Points**:
- Matches existing tool block styling
- Buttons disabled after click to prevent duplicates
- Hidden after handled (tracked in handledPermissions)

### 3. Approval Flow

On approve:
1. Call `markPermissionHandled(tool_use_id)` to prevent duplicate approvals
2. Call `handleSubmit({ message: 'yes, proceed', permissionModeOverride: 'acceptEdits' })`
3. Session automatically resumes (via existing resume logic)
4. Claude retries the blocked operation with acceptEdits mode
5. Operation succeeds and results stream back

**Key Points**:
- Uses existing message submission flow
- No special WebSocket events needed
- Resume happens automatically (session ID already tracked)

## Files to Create/Modify

### New Files (1)

1. `apps/app/src/client/pages/projects/sessions/components/session/claude/blocks/PermissionDenialBlock.tsx` - Inline approval UI component

### Modified Files (3)

1. `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts` - Add handledPermissions state and actions
2. `apps/app/src/client/pages/projects/sessions/components/session/claude/tools/ToolResultRenderer.tsx` - Add permission denial detection and rendering
3. `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx` - Update handleSubmit for permission mode override

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Detection & State

**Phase Complexity**: 8 points (avg 2.7/10)

<!-- prettier-ignore -->
- [ ] perm-1.1 [2/10] Add handledPermissions state to sessionStore
  - Add `handledPermissions: Set<string>` to SessionStore interface
  - Add `markPermissionHandled: (toolUseId: string) => void` action
  - Add `clearHandledPermissions: () => void` action
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
  - Test: Verify actions update Set correctly

- [ ] perm-1.2 [4/10] Add permission denial detection to ToolResultRenderer
  - Import tool_use types to access parent block
  - Add detection: `isError && content.includes('requested permissions')`
  - Extract permissionDetails from tool_use.input (file_path, old_string, new_string)
  - Create enriched permission object with tool details
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/tools/ToolResultRenderer.tsx`
  - Test: Console log when permission denial detected

- [ ] perm-1.3 [2/10] Pass onApprove callback to ToolResultRenderer
  - Update ToolBlockRenderer to pass onApprove callback down
  - Thread callback from ProjectSession → AgentSessionViewer → MessageRenderer → ToolBlockRenderer → ToolResultRenderer
  - File: Multiple components in rendering chain
  - Test: Verify callback reaches ToolResultRenderer

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: UI Rendering

**Phase Complexity**: 8 points (avg 2.7/10)

<!-- prettier-ignore -->
- [ ] perm-2.1 [4/10] Create PermissionDenialBlock component
  - Accept props: toolName, filePath, operation (old_string, new_string), onApprove, onDeny, isPending
  - Render warning icon + "Permission required" header
  - Show file path in code tag
  - Add collapsible <details> with diff view (- old / + new)
  - Add Deny (ghost) and Approve (primary) buttons
  - Disable buttons when isPending
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/blocks/PermissionDenialBlock.tsx`
  - Test: Verify component renders with mock data

- [ ] perm-2.2 [2/10] Integrate PermissionDenialBlock into ToolResultRenderer
  - Import PermissionDenialBlock
  - Render PermissionDenialBlock when permission denial detected
  - Pass extracted permission details as props
  - Pass onApprove/onDeny callbacks
  - Pass isPending from handledPermissions.has(tool_use_id)
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/tools/ToolResultRenderer.tsx`
  - Test: Send message with default mode, verify UI appears

- [ ] perm-2.3 [2/10] Style PermissionDenialBlock to match tool blocks
  - Use existing tool block border/background classes
  - Match spacing with other tool results
  - Ensure mobile responsive (buttons stack on small screens)
  - Add hover states for buttons
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/blocks/PermissionDenialBlock.tsx`
  - Test: Check appearance on desktop and mobile

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Approval Flow

**Phase Complexity**: 7 points (avg 2.3/10)

<!-- prettier-ignore -->
- [ ] perm-3.1 [3/10] Update handleSubmit to accept permissionModeOverride
  - Add optional parameter to handleSubmit: `permissionModeOverride?: PermissionMode`
  - Use override if provided, otherwise use `getPermissionMode()`
  - Update config object with resolved permission mode
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
  - Test: Verify override takes precedence over selector

- [ ] perm-3.2 [2/10] Implement approval handler in ProjectSession
  - Create `handlePermissionApproval(approved: boolean, toolUseId: string)`
  - On deny: call `markPermissionHandled(toolUseId)` and return
  - On approve: call `markPermissionHandled(toolUseId)` then `handleSubmit({ text: 'yes, proceed', permissionModeOverride: 'acceptEdits' })`
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
  - Test: Click approve, verify follow-up message sent with acceptEdits

- [ ] perm-3.3 [2/10] Clear handledPermissions on session change
  - Call `clearHandledPermissions()` in session cleanup effect
  - Clear when sessionId changes or component unmounts
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
  - Test: Switch sessions, verify state cleared

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`PermissionDenialBlock.test.tsx`** - Component rendering and interactions:

```typescript
describe('PermissionDenialBlock', () => {
  it('renders permission request with file path', () => {
    // Test basic rendering
  });

  it('shows diff in collapsible details', () => {
    // Test diff display
  });

  it('disables buttons when isPending', () => {
    // Test disabled state
  });

  it('calls onApprove when Approve clicked', () => {
    // Test approval callback
  });

  it('calls onDeny when Deny clicked', () => {
    // Test deny callback
  });
});
```

### Integration Tests

**Manual test flow**:
1. Select "default" permission mode
2. Send message: "Add a comment to src/test.ts"
3. Verify permission denial shows with file path
4. Verify diff is visible in details
5. Click Approve
6. Verify file is edited and success message appears
7. Verify buttons are hidden/disabled after approval

### E2E Tests

**`permission-approval.e2e.test.ts`** - Full approval flow:

```typescript
test('user can approve file edit via inline buttons', async ({ page }) => {
  // Navigate to session
  // Select default permission mode
  // Send edit request
  // Wait for permission UI
  // Click Approve button
  // Verify file was edited
  // Verify success message appears
});

test('denied permissions do not execute', async ({ page }) => {
  // Similar flow but click Deny
  // Verify file unchanged
  // Verify session ended gracefully
});
```

## Success Criteria

- [ ] Permission denials detected automatically when `is_error: true` and content includes "requested permissions"
- [ ] Inline approval UI appears in message flow with file path and diff
- [ ] Approve button sends follow-up message with `permissionMode: 'acceptEdits'`
- [ ] Session resumes automatically and retries blocked operation
- [ ] File edit succeeds after approval
- [ ] Buttons disabled/hidden after approval to prevent duplicates
- [ ] Deny button closes permission request without action
- [ ] State cleared when switching sessions
- [ ] UI is mobile responsive
- [ ] No console errors or warnings

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

# Unit tests (after tests written)
pnpm test PermissionDenialBlock
# Expected: All tests pass

# Build verification
pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/session/new`
3. Select permission mode: "default" (manual approval)
4. Send message: "Add a comment '// Test' to the top of package.json"
5. Verify: Permission denial UI appears inline with:
   - Warning icon and "Permission required" header
   - File path: `package.json`
   - Collapsible diff showing the change
   - Approve and Deny buttons
6. Click: Approve button
7. Verify: Button shows "Approving..." then disappears
8. Verify: File edit succeeds and success message appears
9. Check console: No errors or warnings

**Feature-Specific Checks:**

- Test with Edit tool (file modifications)
- Test with Write tool (file creation)
- Test with Bash tool (command execution)
- Test Deny button (session ends gracefully)
- Test multiple permission requests in sequence
- Test approval with different permission modes selected
- Verify buttons don't appear in acceptEdits or bypassPermissions modes
- Test mobile layout (buttons stack vertically on small screens)

## Implementation Notes

### 1. Resume Pattern Already Works

Session resume is already implemented and working - every follow-up message uses the same sessionId. Lines 180-193 in ProjectSession.tsx show the resume logic:
```typescript
const resume = assistantMessageCount > 0;
const config = { resume, sessionId, permissionMode };
```

### 2. Permission Mode Can Be Overridden Per Message

The `permissionMode` is passed in the config for each message, so we can override it without changing the UI selector. This is key to the approval flow working cleanly.

### 3. Tool Result Matching Pattern

Messages are enriched via `enrichMessagesWithToolResults()` which nests tool_result into tool_use blocks. This means when rendering a tool_use block, the result is already available at `tool_use.result`. See `.agent/docs/claude-tool-result-patterns.md` for details.

### 4. Detection String

The exact error message from Claude CLI is:
```
"Claude requested permissions to write to /path/to/file.txt, but you haven't granted it yet."
```

Detect with: `result.content.includes('requested permissions')`

## Dependencies

- No new dependencies required
- Uses existing UI components: Button, Collapsible
- Uses existing icons from lucide-react

## References

- Permission testing results: `/tmp/claude-resume-test/RESUME_PATTERN_SUCCESS.md`
- Tool result matching pattern: `.agent/docs/claude-tool-result-patterns.md`
- Session store: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
- Message enrichment: Implemented inline in sessionStore.ts

## Next Steps

1. Implement Phase 1 tasks (detection & state)
2. Implement Phase 2 tasks (UI rendering)
3. Implement Phase 3 tasks (approval flow)
4. Test with real file edit operations
5. Test edge cases (multiple permissions, session switching)
6. Update documentation if needed
