# Fixed Layout Skeleton - App Shell Architecture

**Status**: draft
**Type**: issue
**Created**: 2025-11-21
**Package**: apps/app
**Total Complexity**: 34 points
**Tasks**: 8
**Avg Complexity**: 4.3/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 8        |
| Total Points    | 34       |
| Avg Complexity  | 4.3/10   |
| Max Task        | 6/10     |

## Overview

Implement modern app shell architecture with fixed headers and proper scroll containment. Currently, the entire page scrolls at the viewport level, pushing navigation and headers out of view. This refactor establishes viewport-level height constraints and enables per-page scroll behavior control, fixing issues like kanban boards scrolling the entire app and chat interfaces not maintaining fixed input positions.

## User Story

As a user
I want headers and navigation to remain fixed while content scrolls
So that I can always access navigation and context without scrolling back to the top

## Technical Approach

Implement a **hybrid container-based scrolling pattern** with viewport-level height constraints:

1. **Root Level**: Set viewport height constraint using mobile-safe `h-svh`
2. **Layout Containers**: Use `overflow-hidden` to constrain and `flex flex-col` for structure
3. **Page Content**: Let each page choose its scroll pattern (traditional, fixed-input, split-pane, etc.)

**Key Points**:
- Use `h-svh` (small viewport height) for iOS Safari compatibility
- Add `min-h-0` to flex children for proper Firefox/Safari height calculation
- Use `overflow-hidden` on containers, `overflow-auto` on scroll areas
- Maintain backward compatibility with existing page patterns
- No breaking changes to components that already handle scrolling correctly

## Files to Create/Modify

### New Files (1)

1. `.agent/docs/layout-patterns.md` - Documentation for layout patterns and guidelines

### Modified Files (5)

1. `apps/app/src/client/index.css` - Add root viewport height constraint
2. `apps/app/src/client/components/ui/sidebar.tsx` - Update SidebarInset overflow behavior
3. `apps/app/src/client/layouts/ProjectLoader.tsx` - Add min-h-0 and overflow constraint
4. `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsPage.tsx` - Fix kanban board scrolling
5. `apps/app/src/client/pages/ProjectHomePage.tsx` - Add scroll container wrapper

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] **task-1** [2/10] Add root viewport height constraint
  - Add CSS rule to constrain root to viewport height
  - Use `h-svh` for mobile Safari compatibility
  - File: `apps/app/src/client/index.css`
  - Add after existing styles:
    ```css
    #root {
      height: 100svh;
    }

    @media (min-width: 768px) {
      #root {
        height: 100vh;
      }
    }
    ```

- [ ] **task-2** [4/10] Update SidebarInset overflow behavior
  - Modify SidebarInset to use full height and constrain overflow
  - Change from `flex-1` to `h-full flex flex-col overflow-hidden`
  - File: `apps/app/src/client/components/ui/sidebar.tsx`
  - Update line ~320-328 (SidebarInset component)
  - Change className to include `h-full overflow-hidden`

- [ ] **task-3** [3/10] Fix ProjectLoader content area constraint
  - Add `min-h-0` to content area for proper flex height calculation
  - Change `flex-1 relative` to `flex-1 min-h-0 overflow-hidden relative`
  - File: `apps/app/src/client/layouts/ProjectLoader.tsx`
  - Update line ~113 (content div wrapper)

- [ ] **task-4** [6/10] Fix kanban board scrolling (ProjectWorkflowsPage)
  - Remove `overflow-x-auto` from outer container
  - Add `overflow-hidden` to outer flex container
  - Add `overflow-x-auto` to kanban columns wrapper
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsPage.tsx`
  - Update lines 126 and 141
  - Ensure SearchBar is outside scroll container

- [ ] **task-5** [4/10] Add scroll wrapper to ProjectHomePage
  - Wrap page content in scroll container
  - Add `<div className="h-full overflow-y-auto">` wrapper
  - Maintain existing padding and spacing
  - File: `apps/app/src/client/pages/ProjectHomePage.tsx`
  - Update lines 75-141 (main return statement)

- [ ] **task-6** [5/10] Test all page patterns work correctly
  - Verify traditional scrolling pages (ProjectHomePage, ProjectsPage)
  - Verify fixed-input pages (SessionPage, NewSessionPage)
  - Verify split-pane pages (WorkflowRunDetailPage)
  - Verify kanban pages (ProjectWorkflowsPage, WorkflowDefinitionPage)
  - Test mobile responsiveness
  - Test sidebar collapse/expand behavior

- [ ] **task-7** [6/10] Create layout patterns documentation
  - Document three main patterns (traditional, fixed-input, split-pane)
  - Include code examples for each pattern
  - Document when to use each pattern
  - Add mobile considerations
  - File: `.agent/docs/layout-patterns.md`
  - Reference from apps/app/CLAUDE.md

- [ ] **task-8** [4/10] Test mobile viewport behavior
  - Test on iOS Safari (h-svh handling)
  - Test on Android Chrome
  - Verify keyboard doesn't break fixed layouts
  - Test orientation changes
  - Verify touch scrolling momentum

## Testing Strategy

### Manual Testing

**Desktop (Chrome/Firefox/Safari):**
- Kanban board: Header stays fixed, columns scroll
- Project home: Header fixed, content scrolls
- Chat interface: Header + input fixed, messages scroll
- Workflow detail: Header fixed, split panes scroll independently

**Mobile (iOS Safari/Android Chrome):**
- Sidebar overlay works correctly
- Viewport height respects mobile chrome
- Keyboard doesn't cover fixed inputs
- Touch scrolling has momentum

### Edge Cases

**Test scenarios:**
- Long kanban columns (should scroll internally)
- Short content (should not show scrollbar)
- Sidebar collapse/expand (layout adjusts)
- Modal/dialog open (scroll blocked)
- Dropdown/popover positioning (no conflicts)

## Success Criteria

- [ ] Kanban board headers remain fixed while columns scroll
- [ ] Project header stays visible on all pages
- [ ] Chat interface maintains fixed input at bottom
- [ ] Traditional content pages scroll properly
- [ ] Mobile viewport height works on iOS Safari
- [ ] Sidebar collapse/expand doesn't break layout
- [ ] No visual regressions on existing pages
- [ ] Touch scrolling momentum works on mobile

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
2. Navigate to `/projects/{id}/workflows`
3. Verify: ProjectHeader remains visible when scrolling kanban
4. Scroll kanban column: Only column content scrolls
5. Navigate to `/projects/{id}`
6. Verify: Content scrolls, header stays fixed
7. Test mobile: Resize to 375px width
8. Verify: Layouts work on small screens

## Implementation Notes

### Height Constraint Hierarchy

The height flows from root to content:
```
#root (h-svh)
  → SidebarInset (h-full)
    → ProjectLoader (h-full)
      → Content area (flex-1 min-h-0)
        → Page decides scroll pattern
```

### Mobile Viewport Units

- `h-svh` = Small viewport height (accounts for mobile chrome)
- `h-lvh` = Large viewport height (when chrome hidden)
- `h-dvh` = Dynamic viewport height (DO NOT USE - causes jank)

### Flex Height Calculation

The `min-h-0` is critical for Firefox and Safari to properly calculate flex item heights. Without it, flex children can overflow their containers.

### Backward Compatibility

Pages that already handle scrolling correctly (like WorkflowRunDetailPage with its split-pane layout) won't need changes. The constraint propagation works with existing patterns.

## Dependencies

- No new dependencies
- Uses existing Tailwind v4 utilities
- Compatible with current component library

## References

- [CSS Tricks: Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [MDN: Viewport Units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths)
- [Web.dev: Building an app shell](https://web.dev/app-shell-ux-with-service-workers/)
- Conversation analysis: Comprehensive review of 20+ pages and scroll patterns
