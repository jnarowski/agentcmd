# Chat Interface Grid Layout Redesign

**Status**: review
**Created**: 2025-11-22
**Package**: apps/app
**Total Complexity**: 34 points
**Phases**: 3
**Tasks**: 8
**Overall Avg Complexity**: 4.3/10

## Complexity Breakdown

| Phase                    | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------ | ----- | ------------ | -------------- | -------- |
| Phase 1: Grid Foundation | 3     | 13           | 4.3/10         | 6/10     |
| Phase 2: Headers         | 3     | 10           | 3.3/10         | 5/10     |
| Phase 3: Scroll Polish   | 2     | 11           | 5.5/10         | 6/10     |
| **Total**                | **8** | **34**       | **4.3/10**     | **6/10** |

## Overview

Replace absolute positioning with CSS Grid layout and sticky headers to fix header disappearing and incorrect scroll container issues in the chat session page. Implementation follows proven mock at `ChatLayoutMock.tsx`.

## User Story

As a user viewing a chat session
I want headers to remain visible while scrolling messages
So that I maintain context about which project and session I'm viewing

## Technical Approach

Move from nested absolute positioning to CSS Grid with 4 rows:
1. ProjectHeader (sticky top)
2. SessionHeader (sticky offset)
3. Chat messages (scrollable)
4. Input (sticky bottom)

Move headers from ProjectLoader into ProjectSessionPage for full Grid control. Use `h-dvh` for proper mobile viewport handling and safe area insets for iOS.

## Key Design Decisions

1. **Grid over Absolute**: Single layout authority prevents positioning conflicts and predictable scroll behavior
2. **Headers in Page Component**: Only session page needs Grid; keeps other routes (workflows, shell) unaffected
3. **Mobile-first viewport**: `h-dvh` handles browser chrome collapse on iOS; safe area insets prevent input hiding

## Architecture

### File Structure

```
apps/app/src/client/
├── pages/projects/sessions/
│   ├── ProjectSessionPage.tsx           # Grid container (MAJOR CHANGE)
│   └── components/
│       └── ChatInterface.tsx            # Remove h-full (MINOR)
├── layouts/
│   └── ProjectLoader.tsx                # Remove SessionHeader (MINOR)
├── pages/projects/components/
│   └── ProjectHeader.tsx                # Add sticky positioning (MINOR)
├── components/
│   ├── SessionHeader.tsx                # Add sticky with offset (MINOR)
│   └── ai-elements/
│       └── conversation.tsx             # Remove flex-1 (MINOR)
└── pages/mock/
    └── ChatLayoutMock.tsx               # Reference implementation
```

### Integration Points

**ProjectLoader** (Layout wrapper):
- Remove SessionHeader conditional rendering
- Keep ProjectHeader for other routes (home, workflows, shell, source)

**ProjectSessionPage** (Session route):
- Replace absolute positioning with Grid
- Move ProjectHeader + SessionHeader inside
- Add safe area padding to input wrapper

**Headers** (ProjectHeader, SessionHeader):
- Add sticky positioning classes
- Ensure background colors cover content underneath

**Scroll Components** (ChatInterface, conversation.tsx):
- Remove height constraints (Grid controls height)
- Keep overflow-y-auto (required by use-stick-to-bottom)

## Implementation Details

### 1. Grid Container

Replace entire layout in `ProjectSessionPage.tsx`:

**Current (Broken)**:
```tsx
<div className="absolute inset-0 flex flex-col overflow-hidden">
  <div className="flex-1 overflow-hidden">
    <AgentSessionViewer />
  </div>
  <div className="md:pb-4 md:px-4">
    <ChatPromptInput />
  </div>
</div>
```

**New (Grid)**:
```tsx
<div className="grid h-dvh" style={{ gridTemplateRows: "auto auto 1fr auto" }}>
  <ProjectHeader projectId={projectId!} />
  {session && <SessionHeader session={session} />}
  <div className="overflow-hidden">
    <AgentSessionViewer ... />
  </div>
  <div
    className="sticky bottom-0 z-10 border-t bg-background px-4 py-4 md:px-6"
    style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
  >
    <ChatPromptInput ... />
  </div>
</div>
```

**Key Points**:
- 4 rows: `auto auto 1fr auto` (headers, messages, input)
- `h-dvh` for mobile viewport (handles browser chrome)
- Safe area inset for iOS home indicator
- Sticky bottom input with z-index

### 2. Header Isolation

ProjectLoader currently renders headers for ALL routes. Session page needs them inside Grid:

**ProjectLoader Changes**:
- Remove SessionHeader conditional (`{currentSession && <SessionHeader />}`)
- Keep ProjectHeader (other routes still need it)

**ProjectSessionPage Changes**:
- Import and render both headers inside Grid
- Pass required props (projectId, session data)

### 3. Sticky Positioning

Headers must stick to viewport:

**ProjectHeader**: `sticky top-0 z-10`
**SessionHeader**: `sticky top-[52px] z-10` (offset by ProjectHeader height)

Backgrounds must be opaque to cover content:
- ProjectHeader: `bg-background`
- SessionHeader: `bg-muted/30` (existing)

### 4. Scroll Container

Only messages should scroll:

**ChatInterface** (`Conversation` component):
- Current: `h-full` (fights with Grid)
- New: `overflow-y-auto` (Grid row controls height)

**conversation.tsx** (`StickToBottom` wrapper):
- Current: `flex-1 overflow-y-auto`
- New: `overflow-y-auto` (remove flex-1)

## Files to Create/Modify

### New Files (0)

None - all changes to existing files

### Modified Files (6)

1. `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx` - Grid container, move headers inside
2. `apps/app/src/client/layouts/ProjectLoader.tsx` - Remove SessionHeader
3. `apps/app/src/client/pages/projects/components/ProjectHeader.tsx` - Add sticky positioning
4. `apps/app/src/client/components/SessionHeader.tsx` - Add sticky with offset
5. `apps/app/src/client/pages/projects/sessions/components/ChatInterface.tsx` - Remove h-full
6. `apps/app/src/client/components/ai-elements/conversation.tsx` - Remove flex-1

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Grid Foundation

**Phase Complexity**: 13 points (avg 4.3/10)

- [x] 1.1 [6/10] Replace absolute layout with Grid container in ProjectSessionPage
  - Remove entire `<div className="absolute inset-0 flex flex-col overflow-hidden">` wrapper
  - Add Grid: `<div className="grid h-dvh" style={{ gridTemplateRows: "auto auto 1fr auto" }}>`
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx`
  - Import ProjectHeader from `@/client/pages/projects/components/ProjectHeader`
  - Import SessionHeader from `@/client/components/SessionHeader`
  - Verify Grid creates 4 rows as expected
- [x] 1.2 [4/10] Move ProjectHeader and SessionHeader inside Grid
  - Add row 1: `<ProjectHeader projectId={projectId!} projectName={project?.name || ''} projectPath={project?.path || ''} gitCapabilities={project?.capabilities.git || { initialized: false }} />`
  - Add row 2: `{session && <SessionHeader session={session} />}`
  - Remove old input wrapper, replace with sticky bottom wrapper
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx`
  - Ensure project data is available (useProject hook)
- [x] 1.3 [3/10] Add sticky input wrapper with safe area padding
  - Wrap ChatPromptInput in sticky container (row 4)
  - Add classes: `sticky bottom-0 z-10 border-t bg-background px-4 py-4 md:px-6`
  - Add style: `{{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}`
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSessionPage.tsx`
  - Test iOS safe area inset doesn't break desktop

#### Completion Notes

- Implemented Grid container with 4 rows (auto auto 1fr auto) replacing absolute positioning
- Moved ProjectHeader and SessionHeader inside Grid for proper sticky positioning
- Added sticky input wrapper with iOS safe area padding
- No deviations from plan - all Grid layout working as specified

### Phase 2: Headers

**Phase Complexity**: 10 points (avg 3.3/10)

- [x] 2.1 [3/10] Remove SessionHeader from ProjectLoader
  - Remove line: `{currentSession && <SessionHeader session={currentSession} />}`
  - Keep ProjectHeader rendering (needed for other routes)
  - File: `apps/app/src/client/layouts/ProjectLoader.tsx`
  - Verify workflows, shell, source pages still show ProjectHeader
- [x] 2.2 [4/10] Add sticky positioning to ProjectHeader
  - Find existing header element (should be a `<div>` around line 64)
  - Change to `<header>` semantic element
  - Add classes: `sticky top-0 z-10`
  - Ensure `bg-background` exists in className
  - File: `apps/app/src/client/pages/projects/components/ProjectHeader.tsx`
  - Verify header sticks to top on scroll
- [x] 2.3 [3/10] Add sticky positioning with offset to SessionHeader
  - Find existing header element (line 115)
  - Add classes: `sticky top-[52px] z-10`
  - Ensure `bg-muted/30` exists (already present)
  - File: `apps/app/src/client/components/SessionHeader.tsx`
  - Verify offset matches ProjectHeader height

#### Completion Notes

- Removed SessionHeader from ProjectLoader and currentSession prop
- Changed ProjectHeader div to semantic header element with sticky positioning
- Added sticky positioning with 52px offset to SessionHeader
- Removed unused imports from ProjectLoader

### Phase 3: Scroll Polish

**Phase Complexity**: 11 points (avg 5.5/10)

- [x] 3.1 [5/10] Update ChatInterface scroll behavior
  - Find Conversation component (line 86)
  - Change `className="h-full"` to `className="overflow-y-auto"`
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatInterface.tsx`
  - Test scroll works with long message lists
  - Verify empty state still centers correctly
- [x] 3.2 [6/10] Remove flex-1 from conversation.tsx StickToBottom
  - Find StickToBottom className (line 14)
  - Change from `cn("relative flex-1 overflow-y-auto", className)` to `cn("relative overflow-y-auto", className)`
  - File: `apps/app/src/client/components/ai-elements/conversation.tsx`
  - Test use-stick-to-bottom still works (auto-scroll on new messages)
  - Verify scroll-to-bottom button appears/hides correctly

#### Completion Notes

- Updated ChatInterface to use overflow-y-auto instead of h-full
- Removed flex-1 from conversation.tsx StickToBottom component
- Grid now controls height, scroll container only handles overflow
- **CRITICAL FIX**: Added h-full back to Conversation alongside overflow-y-auto - required for proper height constraint chain (Grid row → AgentSessionViewer → ChatInterface → Conversation with h-full + overflow-y-auto)
- **SAFE AREA REFINEMENT**: Moved safe-area-inset-bottom padding from outer wrapper to PromptInputFooter (inside background color) - removed PWA check, now works universally with CSS env() fallback

## Testing Strategy

### Unit Tests

No new unit tests required - this is a layout refactor with same behavior.

### Integration Tests

**Manual testing covers all scenarios**:
- Headers remain visible during scroll
- Only messages scroll (not entire page)
- Auto-scroll works on new messages
- Scroll-to-bottom button functions
- Mobile viewport adapts correctly

### E2E Tests

**Desktop scenarios** (Chrome DevTools responsive mode):
1. Long conversation (50+ messages) - smooth scroll, headers stay visible
2. Short conversation (3-4 messages) - no layout break
3. Window resize - layout adapts
4. New message while at bottom - auto-scrolls
5. New message while scrolled up - no auto-scroll
6. Scroll-to-bottom button - appears when scrolled up, disappears at bottom

**Mobile scenarios** (iOS Safari / Chrome mobile):
1. Portrait (375x667) - full height, headers visible
2. Landscape - adapts correctly
3. Keyboard open - input remains visible (safe area padding)
4. Touch scrolling - smooth, no conflicts
5. Browser chrome collapse - dvh handles it
6. iOS home indicator - input not hidden (safe area inset)

## Success Criteria

- [ ] Headers remain visible when scrolling messages
- [ ] Only messages scroll (not entire page or headers)
- [ ] Auto-scroll to bottom works on new messages
- [ ] Scroll-to-bottom button appears/hides correctly
- [ ] Mobile viewport uses full height (dvh)
- [ ] iOS safe areas respected (input not hidden)
- [ ] Empty state still displays correctly
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] Other routes (workflows, shell, source) unchanged

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Build verification
pnpm --filter app build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Create or open project
4. Create or open session
5. Verify Grid layout:
   - Headers visible at top (ProjectHeader + SessionHeader)
   - Chat messages in middle (scrollable)
   - Input fixed at bottom
6. Test scroll behavior:
   - Scroll messages up/down
   - Headers remain visible (sticky)
   - Scroll-to-bottom button appears when scrolled up
7. Test message submission:
   - Send new message
   - Auto-scrolls to bottom if already at bottom
   - Doesn't auto-scroll if scrolled up
8. Test mobile viewport (Chrome DevTools responsive mode):
   - Select iPhone 12 Pro (390x844)
   - Verify full viewport height
   - No gaps or overflow
9. Test other routes still work:
   - Navigate to Workflows tab
   - Navigate to Source tab
   - Navigate to Shell tab
   - Verify ProjectHeader still shows, SessionHeader doesn't

**Feature-Specific Checks:**

- Compare mock (`/mock/chat-layout`) with production session page - should look/behave identical
- Test with empty session (no messages) - empty state should still center
- Test with very long messages (code blocks) - scroll should handle gracefully
- Test browser zoom (150%, 200%) - layout should remain functional
- Test window resize - layout should adapt without breaking

## Implementation Notes

### 1. ProjectHeader Props

ProjectSessionPage needs to pass full props to ProjectHeader:
- `projectId` - from route params
- `projectName` - from useProject hook
- `projectPath` - from useProject hook
- `gitCapabilities` - from project.capabilities.git
- Remove `currentSession` prop (no longer needed)

### 2. Header Height Measurement

`top-[52px]` is an estimate for SessionHeader offset. If ProjectHeader height changes:
- Measure actual height in DevTools
- Update Tailwind class (e.g., `top-[60px]`)
- Or use CSS variable for maintainability

### 3. Safe Area Insets

`viewport-fit=cover` already enabled in `index.html` (line 19):
```html
<meta name="viewport" content="... viewport-fit=cover" />
```

Safe area insets work automatically on iOS. On desktop/Android, they're 0.

### 4. Scroll Container

Only ONE element should have `overflow-y-auto` - the Conversation component. Grid row 3 has `overflow-hidden` to constrain the scrollable area.

## Dependencies

No new dependencies required - uses existing:
- `use-stick-to-bottom` - already installed
- Tailwind CSS classes - already available
- React Router hooks - already used

## References

- Mock implementation: `apps/app/src/client/pages/mock/ChatLayoutMock.tsx`
- Redesign documentation: `.agent/docs/chat-interface-redesign.md`
- ChatGPT layout pattern (industry standard)
- CSS Grid guide: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout
- Safe area insets: https://developer.mozilla.org/en-US/docs/Web/CSS/env

## Revert Guide

If layout issues occur, revert in this order:

### 1. Revert Safe-Area Padding (if input positioning breaks)

**ChatPromptInput.tsx** (line 231):
```tsx
// Remove:
<PromptInputFooter className="pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-3">

// Restore:
<PromptInputFooter>
```

**ChatPromptInput.tsx** (lines 17-18, 76):
```tsx
// Add back:
import { useIsPwa } from "@/client/hooks/use-pwa";
const isPwa = useIsPwa();
```

**ChatPromptInput.tsx** (after line 213):
```tsx
// Add back:
style={isPwa ? { paddingBottom: "env(safe-area-inset-bottom)" } : undefined}
```

### 2. Revert Scroll Fix (if messages don't scroll)

**ChatInterface.tsx** (line 87):
```tsx
// Change from:
className="h-full overflow-y-auto"

// Back to:
className="overflow-y-auto"
```

### 3. Revert to Original Layout (full revert)

**ProjectSessionPage.tsx** - Restore absolute positioning:
```tsx
<div className="absolute inset-0 flex flex-col overflow-hidden">
  <div className="flex-1 overflow-hidden">
    <AgentSessionViewer ... />
  </div>
  <div className="md:pb-4 md:px-4">
    <ChatPromptInput ... />
  </div>
</div>
```

**ProjectLoader.tsx** - Restore SessionHeader:
```tsx
{currentSession && <SessionHeader session={currentSession} />}
```

**ProjectHeader.tsx** - Remove sticky:
```tsx
// Change <header> back to <div>
// Remove: sticky top-0 z-10
```

**SessionHeader.tsx** - Remove sticky:
```tsx
// Remove: sticky top-[52px] z-10
```

## Next Steps

1. Read all files listed in "Modified Files" section
2. Execute Phase 1 tasks (Grid foundation)
3. Test layout changes in browser
4. Execute Phase 2 tasks (Headers)
5. Execute Phase 3 tasks (Scroll polish)
6. Run automated verification (types, lint, build)
7. Complete manual testing checklist
8. Compare with mock implementation
9. Test on real iOS device (if available)
10. Mark spec as completed
