# New Followup Session Action

**Status**: draft
**Type**: issue
**Created**: 2025-11-29
**Package**: apps/app
**Total Complexity**: 24 points
**Tasks**: 5
**Avg Complexity**: 4.8/10

## Complexity Summary

| Metric         | Value    |
| -------------- | -------- |
| Total Tasks    | 5        |
| Total Points   | 24       |
| Avg Complexity | 4.8/10   |
| Max Task       | 6/10     |

## Overview

Add "New Followup Session" action to the SpecItem dropdown menu that navigates to `/sessions/new` with pre-populated chat input. This allows users to easily continue working on completed specs by creating a new session with the spec file already referenced.

## User Story

As a user
I want to create a followup session for a completed spec
So that I can iterate on the spec, fix issues, or make improvements without manually typing the spec file path

## Technical Approach

Add query parameter support (`?initialMessage=`) to NewSessionPage, enhance ChatPromptInput to accept and display initial text on mount, and add a new dropdown menu item to SpecItem that navigates with the pre-populated message.

**Key Points:**
- Use query parameters to pass initial message (stateless, no store pollution)
- Initialize controller text input on mount, then controller manages state
- Message format: `Read @.agent/specs/done/my-spec/spec.md and related context.`
- Leverage existing `@` file reference pattern already supported by ChatPromptInput

## Files to Create/Modify

### New Files (0)

None - all changes to existing files

### Modified Files (4)

1. `apps/app/src/client/pages/projects/sessions/NewSessionPage.tsx` - Read `?initialMessage=` query param and pass to ChatPromptInput
2. `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Add `initialText` prop and initialize controller
3. `apps/app/src/client/pages/projects/sessions/hooks/usePromptInputState.ts` - Accept and use `initialText` for controller initialization
4. `apps/app/src/client/components/sidebar/SpecItem.tsx` - Add "New Followup Session" menu item with handler

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] [task-1] [4/10] Add `initialText` prop support to ChatPromptInput component
  - Add `initialText?: string` to `ChatPromptInputProps` interface
  - Pass `initialText` to `ChatPromptInputInner` component
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`

- [ ] [task-2] [5/10] Enhance usePromptInputState hook to accept and use initialText
  - Add `initialText?: string` parameter to `UsePromptInputStateParams` interface
  - Add useEffect to initialize controller with `initialText` on mount if provided
  - Ensure initialization only happens once (dependency array: `[initialText, controller]`)
  - Use `controller.textInput.setInput(initialText)` to set initial value
  - File: `apps/app/src/client/pages/projects/sessions/hooks/usePromptInputState.ts`

- [ ] [task-3] [4/10] Read initialMessage query parameter in NewSessionPage and pass to ChatPromptInput
  - Read `?initialMessage=` from searchParams (already uses `useSearchParams()`)
  - Decode query parameter: `const initialMessage = searchParams.get('initialMessage') ? decodeURIComponent(searchParams.get('initialMessage')!) : undefined`
  - Pass `initialText={initialMessage}` prop to `<ChatPromptInput />`
  - File: `apps/app/src/client/pages/projects/sessions/NewSessionPage.tsx`

- [ ] [task-4] [6/10] Add "New Followup Session" dropdown menu item to SpecItem
  - Import `MessageSquarePlus` icon from lucide-react
  - Add new `DropdownMenuItem` after "Edit Spec" item (before "Move to..." section)
  - Item label: "New Followup Session"
  - Click handler: `handleNewFollowupSession(e)`
  - Handler implementation:
    - Stop propagation: `e.stopPropagation()`
    - Construct message: `Read @${spec.specPath} and related context.`
    - URL encode: `encodeURIComponent(message)`
    - Navigate: `/projects/${spec.projectId}/sessions/new?initialMessage=${encoded}`
    - Close mobile sidebar if open
  - File: `apps/app/src/client/components/sidebar/SpecItem.tsx`

- [ ] [task-5] [5/10] Test the complete flow end-to-end
  - Verify query param is read correctly in NewSessionPage
  - Verify ChatPromptInput displays pre-populated message on mount
  - Verify user can edit the pre-populated message
  - Verify `@` file picker still works after pre-population
  - Verify message submits correctly and creates session
  - Test with spec paths containing spaces and special characters
  - Test interaction with existing `?mode=` query parameter
  - Manual testing: All scenarios above

## Testing Strategy

### Unit Tests

Not applicable - UI integration feature, covered by manual testing

### Integration Tests

Not applicable - primarily UI flow, manual verification sufficient

## Success Criteria

- [ ] Clicking "New Followup Session" in SpecItem dropdown navigates to `/sessions/new`
- [ ] Chat input is pre-populated with `Read @[specPath] and related context.`
- [ ] User can edit or clear the pre-populated message
- [ ] File picker `@` menu still functions correctly
- [ ] Submitting message creates session and references spec file
- [ ] Special characters and spaces in spec paths are handled correctly
- [ ] Works alongside existing `?mode=` query parameter
- [ ] No TypeScript errors
- [ ] No console errors or warnings

## Validation

**Automated:**

```bash
# Type checking
pnpm check-types
# Expected: no type errors

# Linting
pnpm lint
# Expected: no lint errors

# Build
pnpm build
# Expected: successful build
```

**Manual:**

1. Start app: `pnpm dev` (from apps/app/)
2. Navigate to a project with completed specs
3. Open a spec's dropdown menu in sidebar
4. Click "New Followup Session"
5. Verify: Navigates to `/sessions/new` with pre-populated chat input
6. Verify: Chat input shows `Read @.agent/specs/done/[spec-name]/spec.md and related context.`
7. Verify: Can edit the message
8. Verify: Typing `@` still opens file picker
9. Verify: Submitting creates session with spec reference
10. Test: Spec with spaces in path (URL encoding works)
11. Test: Navigate with `?mode=plan` preserved

## Implementation Notes

### 1. No Store State Pollution

The `initialMessage` is NOT added to `sessionStore.form`. It's transient, one-time initialization passed via query parameter → component prop → controller initialization. After mount, the controller manages all text state locally.

### 2. Controller Initialization Timing

Use `useEffect` with proper dependencies `[initialText, controller]` to set initial text when controller is ready. This ensures the controller is initialized before we try to set its value.

### 3. Query Parameter Encoding

Always use `encodeURIComponent()` when constructing the navigation URL to handle special characters and spaces in spec paths. Decode with `decodeURIComponent()` when reading in NewSessionPage.

## Dependencies

- No new dependencies required
- Uses existing lucide-react icons (`MessageSquarePlus`)
- Uses existing query parameter patterns
- Uses existing controller from ai-elements library

## References

- Conversation: Discussion about state management and avoiding conflicts with sessionStore
- Exploration: NewSessionPage and ChatPromptInput architecture
- Pattern: Similar to existing `?mode=` query parameter handling
