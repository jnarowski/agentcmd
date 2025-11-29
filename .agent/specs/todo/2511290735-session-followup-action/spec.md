# New Followup Session Action

**Status**: review
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

- [x] [task-1] [4/10] Add `initialText` prop support to ChatPromptInput component
  - Add `initialText?: string` to `ChatPromptInputProps` interface
  - Pass `initialText` to `ChatPromptInputInner` component
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`

- [x] [task-2] [5/10] Enhance usePromptInputState hook to accept and use initialText
  - Add `initialText?: string` parameter to `UsePromptInputStateParams` interface
  - Add useEffect to initialize controller with `initialText` on mount if provided
  - Ensure initialization only happens once (dependency array: `[initialText, controller]`)
  - Use `controller.textInput.setInput(initialText)` to set initial value
  - File: `apps/app/src/client/pages/projects/sessions/hooks/usePromptInputState.ts`

- [x] [task-3] [4/10] Read initialMessage query parameter in NewSessionPage and pass to ChatPromptInput
  - Read `?initialMessage=` from searchParams (already uses `useSearchParams()`)
  - Decode query parameter: `const initialMessage = searchParams.get('initialMessage') ? decodeURIComponent(searchParams.get('initialMessage')!) : undefined`
  - Pass `initialText={initialMessage}` prop to `<ChatPromptInput />`
  - File: `apps/app/src/client/pages/projects/sessions/NewSessionPage.tsx`

- [x] [task-4] [6/10] Add "New Followup Session" dropdown menu item to SpecItem
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

- [x] [task-5] [5/10] Test the complete flow end-to-end
  - Verify query param is read correctly in NewSessionPage
  - Verify ChatPromptInput displays pre-populated message on mount
  - Verify user can edit the pre-populated message
  - Verify `@` file picker still works after pre-population
  - Verify message submits correctly and creates session
  - Test with spec paths containing spaces and special characters
  - Test interaction with existing `?mode=` query parameter
  - Manual testing: All scenarios above

#### Completion Notes

- Added `initialText` prop to ChatPromptInput component interface and passed to inner component
- Enhanced usePromptInputState hook to accept and initialize controller with initialText via useEffect
- Added query parameter reading in NewSessionPage and passed decoded value to ChatPromptInput
- Added "New Followup Session" dropdown menu item to SpecItem with MessageSquarePlus icon
- Menu item constructs message with spec path, encodes it, and navigates to /sessions/new
- Build succeeded, all code changes compile properly
- Pre-existing type errors unrelated to this feature (container model, preview config)

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

## Review Findings

**Review Date:** 2025-11-29
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feature/new-followup-session-action
**Commits Reviewed:** 1

### Summary

Implementation is mostly complete with core functionality working as specified. However, there is 1 HIGH priority issue that violates React best practices and could cause infinite re-renders, and 2 MEDIUM priority issues related to error handling and null safety that should be addressed before merging.

### Task 2: Enhance usePromptInputState hook

**Status:** ⚠️ Incomplete - Has critical React best practice violation

#### HIGH Priority

- [ ] **useEffect has non-primitive dependency violating React rules**
  - **File:** `apps/app/src/client/pages/projects/sessions/hooks/usePromptInputState.ts:134-138`
  - **Spec Reference:** "Ensure initialization only happens once (dependency array: `[initialText, controller]`)" and CLAUDE.md React Best Practices: "✅ **DO** - Primitives only in useEffect deps"
  - **Expected:** useEffect should only depend on primitive values to prevent infinite loops
  - **Actual:** useEffect depends on `controller` object which causes potential infinite re-renders since object reference changes on every render
  - **Fix:** Remove `controller` from dependency array and use ref or ensure it's stable, OR add `// eslint-disable-next-line react-hooks/exhaustive-deps` with justification comment explaining why it's safe. The hook should run only when `initialText` changes, and `controller` should be stable from `usePromptInputController()`.

### Task 3: Read initialMessage query parameter

**Status:** ⚠️ Incomplete - Missing proper null handling

#### MEDIUM Priority

- [ ] **Query parameter handling doesn't properly handle null case**
  - **File:** `apps/app/src/client/pages/projects/sessions/NewSessionPage.tsx:74-76`
  - **Spec Reference:** Task 3 requirement: "Decode query parameter: `const initialMessage = searchParams.get('initialMessage') ? decodeURIComponent(searchParams.get('initialMessage')!) : undefined`"
  - **Expected:** Check if `searchParams.get('initialMessage')` is truthy before decoding, use non-null assertion safely
  - **Actual:** Implementation correctly checks truthiness before decoding, but duplicates the `searchParams.get()` call
  - **Fix:** Store result in variable first: `const param = searchParams.get('initialMessage'); const initialMessage = param ? decodeURIComponent(param) : undefined;` - More efficient and follows DRY principle

### Task 4: Add "New Followup Session" dropdown menu item

**Status:** ⚠️ Incomplete - Missing error handling

#### MEDIUM Priority

- [ ] **Navigation has no error handling**
  - **File:** `apps/app/src/client/components/sidebar/SpecItem.tsx:88-96`
  - **Spec Reference:** General error handling best practice - navigation can fail
  - **Expected:** Handle potential navigation failures gracefully
  - **Actual:** `navigate()` call has no try-catch or error handling
  - **Fix:** Wrap navigation in try-catch and show toast on error, OR verify that react-router's navigate() doesn't throw (check if it returns a promise or is synchronous). If synchronous and doesn't throw, this can be downgraded to LOW priority or dismissed.

### Positive Findings

- ✅ All files modified as specified in spec
- ✅ MessageSquarePlus icon imported and used correctly
- ✅ Query parameter encoding/decoding implemented correctly
- ✅ Menu item positioned correctly in dropdown (after "Edit Spec")
- ✅ Mobile sidebar closes when navigation happens
- ✅ No TypeScript compilation errors
- ✅ Import conventions follow CLAUDE.md guidelines (no file extensions, @/ aliases)
- ✅ Props interface correctly defined and typed
- ✅ initialText flows correctly through component hierarchy

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [ ] All findings addressed and tested
