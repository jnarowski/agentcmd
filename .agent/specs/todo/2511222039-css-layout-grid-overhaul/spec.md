# CSS Layout Grid Overhaul

**Status**: draft
**Created**: 2025-11-22
**Package**: apps/app (frontend)
**Total Complexity**: 142 points
**Phases**: 5
**Tasks**: 32
**Overall Avg Complexity**: 4.4/10

## Complexity Breakdown

| Phase                               | Tasks | Total Points | Avg Complexity | Max Task |
| ----------------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 0: Foundation (Critical)      | 6     | 38           | 6.3/10         | 8/10     |
| Phase 1: Low-Risk Validation        | 4     | 12           | 3.0/10         | 4/10     |
| Phase 2: Standard Pages             | 9     | 36           | 4.0/10         | 5/10     |
| Phase 3: Complex Layouts (High Risk)| 4     | 32           | 8.0/10         | 9/10     |
| Phase 4: Cleanup & Standardization  | 5     | 15           | 3.0/10         | 4/10     |
| Phase 5: Documentation              | 4     | 9            | 2.3/10         | 3/10     |
| **Total**                           | **32**| **142**      | **4.4/10**     | **9/10** |

## Overview

Systematically refactor the entire frontend layout system from inconsistent Flex patterns to standardized CSS Grid layouts. This migration eliminates 45+ scroll bugs, removes 12 CSS hacks, establishes 6 reusable layout patterns, and fixes critical issues like kanban board scroll behavior and broken height constraint chains.

## User Story

As a developer maintaining the frontend
I want a unified Grid-based layout system with standard patterns
So that layouts are predictable, scroll bugs are eliminated, and new pages follow consistent conventions without layout guesswork

## Technical Approach

**Strategy**: Incremental phase-based migration starting with foundational fixes (AppLayout, ProjectLoader height chain), then progressing from low-risk to high-risk pages. Create 6 reusable layout pattern components that encapsulate Grid configurations using Tailwind arbitrary values (`grid-rows-[auto_1fr]`).

**Key Principle**: Grid's `1fr` means "exactly remaining space" vs Flex's `flex-1` which "grows to fit content" - this establishes height authority chains that enable internal scroll instead of body scroll.

## Key Design Decisions

1. **Use Tailwind Grid Utilities**: All Grid patterns use Tailwind arbitrary values (e.g., `grid-rows-[auto_1fr]`) for consistency with codebase conventions
2. **Incremental Migration**: Phase-based approach (foundation → low-risk → high-risk → cleanup) minimizes disruption and validates approach before complex pages
3. **6 Standard Patterns**: KanbanLayout (Trello-style), SplitPaneLayout, StandardPageLayout, FullHeightLayout, CenteredLayout, ContentFlowLayout cover 100% of current pages
4. **Fix Root Cause First**: ProjectLoader's conditional height logic (`h-screen` vs `h-full`) is the critical blocker affecting all pages - must be fixed before any page migrations
5. **Semantic Z-Index System**: Replace arbitrary z-index values with Tailwind semantic scale (z-sticky, z-dropdown, z-popover, z-modal, z-system)

## Architecture

### File Structure
```
apps/app/src/client/
├── layouts/
│   ├── AppLayout.tsx              # Root layout (add h-dvh to SidebarInset)
│   ├── ProjectLoader.tsx          # Project wrapper (fix conditional height)
│   └── patterns/                  # NEW - Reusable Grid patterns
│       ├── KanbanLayout.tsx       # Trello-style: horizontal scroll + vertical columns
│       ├── SplitPaneLayout.tsx    # Two independent scroll regions
│       ├── StandardPageLayout.tsx # Most common: sticky header + scrollable
│       ├── FullHeightLayout.tsx   # 4-row grid (header + subheader + content + footer)
│       ├── CenteredLayout.tsx     # Auth pages (minimal wrapper)
│       └── ContentFlowLayout.tsx  # Natural scroll (minimal wrapper)
├── pages/projects/
│   ├── workflows/
│   │   ├── ProjectWorkflowsPage.tsx        # Convert to KanbanLayout
│   │   ├── WorkflowRunDetailPage.tsx       # Convert to SplitPaneLayout
│   │   └── components/
│   │       └── WorkflowKanbanColumn.tsx    # Add min-h-0 for scroll fix
│   ├── source/
│   │   ├── ProjectSourceControl.tsx        # Convert to StandardPageLayout
│   │   └── ProjectSourcePage.tsx           # Convert to StandardPageLayout
│   ├── shell/ProjectShellPage.tsx          # Convert to FullHeightLayout
│   └── ... (8 more standard pages)
└── components/
    ├── ProjectHeader.tsx          # Remove sticky (Grid handles positioning)
    └── SessionHeader.tsx          # Remove sticky top-[52px]
```

### Integration Points

**Root Layout Chain**:
- `AppLayout.tsx` - Add `h-dvh grid grid-rows-[1fr]` to SidebarInset
- `ProjectLoader.tsx` - Replace conditional with `grid h-full grid-rows-[auto_1fr]`
- Pages - All receive consistent height context from parent Grid

**Pattern Component Integration**:
- Each page imports appropriate pattern component
- Pattern components accept header/content/footer slots
- Tailwind Grid utilities replace inline style objects

**Z-Index System**:
- `tailwind.config.js` - Add semantic z-index scale
- 26 UI components - Replace z-50, z-10 with semantic values
- Eliminates potential stacking context conflicts

## Implementation Details

### 1. Root Height Chain Fix (Critical Blocker)

**Problem**: ProjectLoader uses conditional `isWorkflowRoute ? "h-screen" : "h-full"`, but SidebarInset has no height set. This creates inconsistent height base for all child pages.

**Solution**:
- AppLayout: Add `h-dvh` to SidebarInset to establish viewport height
- ProjectLoader: Remove conditional, use `grid grid-rows-[auto_1fr]` for all routes
- Child pages: All receive predictable `h-full` context from parent Grid

**Key Points**:
- This fix is CRITICAL - blocks all other migrations
- Affects ALL 23 pages in project routes
- Simple change but highest impact

### 2. Kanban Layout (Trello-Style)

**Pattern**: Horizontal board scroll (left-to-right) + vertical column scroll (cards)

**Grid Structure**:
```tsx
<div className="grid h-full grid-rows-[auto_auto_1fr]">
  <PageHeader />
  <SearchBar />
  <div className="overflow-x-auto overflow-y-hidden">
    <div className="flex gap-4 h-full p-4 min-w-max">
      <div className="w-[320px] flex-shrink-0 grid grid-rows-[auto_1fr]">
        <div className="p-4"><h3>Status</h3></div>
        <div className="overflow-y-auto p-4 space-y-2">{cards}</div>
      </div>
    </div>
  </div>
</div>
```

**Key Points**:
- `grid-rows-[auto_auto_1fr]` - header + filters + exact remaining space for board
- `overflow-x-auto` - board scrolls horizontally
- `min-w-max` - prevents columns from shrinking
- `w-[320px] flex-shrink-0` - columns fixed width (Trello-style)
- `overflow-y-auto` - cards scroll vertically within column

### 3. Split-Pane Layout

**Pattern**: Two independent scroll regions side-by-side

**Grid Structure**:
```tsx
<div className="grid h-full grid-rows-[auto_1fr]">
  <PageHeader />
  <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden">
    <div className="grid grid-rows-[auto_1fr]">
      <div className="border-b px-6 py-4"><h2>Timeline</h2></div>
      <div className="overflow-y-auto"><PhaseTimeline /></div>
    </div>
    <div className="grid grid-rows-[auto_1fr]">
      <div className="border-b px-6 py-4"><h2>Details</h2></div>
      <div className="overflow-y-auto"><DetailPanel /></div>
    </div>
  </div>
</div>
```

**Key Points**:
- Nested grids for each pane (header + scrollable content)
- `overflow-hidden` on parent prevents scroll propagation
- Each pane has independent `overflow-y-auto`
- Responsive: single column on mobile (`grid-cols-1`)

### 4. Standard Page Layout

**Pattern**: Sticky header + scrollable content (most common)

**Grid Structure**:
```tsx
<div className="grid h-full grid-rows-[auto_1fr]">
  <PageHeader />
  <div className="overflow-y-auto">{content}</div>
</div>
```

**Key Points**:
- Simplest pattern - used by 8+ pages
- Header auto-sized, content gets remaining space
- No sticky positioning needed (Grid handles it)

### 5. Z-Index Semantic System

**Tailwind Config**:
```js
theme: {
  extend: {
    zIndex: {
      'background': '-10',
      'sticky': '10',
      'dropdown': '20',
      'popover': '30',
      'modal': '50',
      'fullscreen': '60',
      'system': '100',
    }
  }
}
```

**Migration Map**:
- Current `z-10` → `z-sticky` (ProjectHeader, SessionHeader)
- Current `z-50` (dropdowns) → `z-dropdown`
- Current `z-50` (modals) → `z-modal`
- Current `z-50` (file viewers) → `z-fullscreen`
- Current `z-100` → `z-system` (ConnectionStatusBanner)

## Files to Create/Modify

### New Files (6)

1. `apps/app/src/client/layouts/patterns/KanbanLayout.tsx` - Trello-style kanban pattern
2. `apps/app/src/client/layouts/patterns/SplitPaneLayout.tsx` - Two pane layout
3. `apps/app/src/client/layouts/patterns/StandardPageLayout.tsx` - Header + content
4. `apps/app/src/client/layouts/patterns/FullHeightLayout.tsx` - 4-row grid
5. `apps/app/src/client/layouts/patterns/CenteredLayout.tsx` - Auth pages wrapper
6. `apps/app/src/client/layouts/patterns/ContentFlowLayout.tsx` - Natural scroll wrapper

### Modified Files (40+)

**Critical Foundation (2)**:
1. `apps/app/src/client/layouts/AppLayout.tsx` - Add h-dvh to SidebarInset
2. `apps/app/src/client/layouts/ProjectLoader.tsx` - Remove conditional height logic

**Page Migrations (23)**:
3. `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsPage.tsx` - KanbanLayout
4. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx` - SplitPaneLayout
5. `apps/app/src/client/pages/projects/workflows/WorkflowDefinitionPage.tsx` - KanbanLayout
6. `apps/app/src/client/pages/projects/source/ProjectSourceControl.tsx` - StandardPageLayout
7. `apps/app/src/client/pages/projects/source/ProjectSourcePage.tsx` - StandardPageLayout
8. `apps/app/src/client/pages/projects/shell/ProjectShellPage.tsx` - FullHeightLayout
9-23. *(8 more standard pages, 3 auth pages, 4 content pages)*

**Component Updates (3)**:
24. `apps/app/src/client/pages/projects/workflows/components/WorkflowKanbanColumn.tsx` - Add min-h-0
25. `apps/app/src/client/components/ProjectHeader.tsx` - Remove sticky positioning
26. `apps/app/src/client/components/SessionHeader.tsx` - Remove sticky top-[52px]

**Z-Index Standardization (~14 UI components)**:
27. `apps/app/src/client/components/ui/dialog.tsx`
28. `apps/app/src/client/components/ui/dropdown-menu.tsx`
29-40. *(12 more UI components with z-index)*

**Config**:
41. `apps/app/tailwind.config.js` - Add semantic z-index scale

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 0: Foundation (Critical - DO FIRST)

**Phase Complexity**: 38 points (avg 6.3/10)

- [ ] 0.1 [8/10] Fix AppLayout SidebarInset height constraint
  - Add `h-dvh grid grid-rows-[1fr]` to SidebarInset
  - File: `apps/app/src/client/layouts/AppLayout.tsx`
  - This establishes viewport height for all child routes
  - Test: Verify all project pages still render correctly

- [ ] 0.2 [9/10] Fix ProjectLoader conditional height logic (CRITICAL BLOCKER)
  - Remove `isWorkflowRoute` conditional (`h-screen` vs `h-full`)
  - Replace with `grid h-full grid-rows-[auto_1fr]` for all routes
  - File: `apps/app/src/client/layouts/ProjectLoader.tsx`
  - Simplifies ~92 lines to ~30 lines
  - Test: Load workflow page, session page, source page - all should work

- [ ] 0.3 [6/10] Create KanbanLayout pattern component
  - Trello-style: `grid-rows-[auto_auto_1fr]` + horizontal scroll
  - Props: `header`, `filters`, `columns`
  - File: `apps/app/src/client/layouts/patterns/KanbanLayout.tsx`
  - Include responsive handling for mobile

- [ ] 0.4 [5/10] Create SplitPaneLayout pattern component
  - Two independent scroll regions: `grid-rows-[auto_1fr]`
  - Props: `header`, `leftPane`, `rightPane`
  - File: `apps/app/src/client/layouts/patterns/SplitPaneLayout.tsx`
  - Responsive: single column on mobile

- [ ] 0.5 [5/10] Create StandardPageLayout pattern component
  - Most common: `grid-rows-[auto_1fr]`
  - Props: `header`, `content`
  - File: `apps/app/src/client/layouts/patterns/StandardPageLayout.tsx`

- [ ] 0.6 [5/10] Create FullHeightLayout, CenteredLayout, ContentFlowLayout
  - FullHeightLayout: `grid-rows-[auto_auto_1fr_auto]` (session pages)
  - CenteredLayout: `flex min-h-screen items-center justify-center`
  - ContentFlowLayout: Minimal wrapper (natural scroll)
  - Files: `apps/app/src/client/layouts/patterns/` (3 files)

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 1: Low-Risk Validation

**Phase Complexity**: 12 points (avg 3.0/10)

- [ ] 1.1 [4/10] Migrate ProjectShellPage to FullHeightLayout
  - Simple flex→grid swap
  - File: `apps/app/src/client/pages/projects/shell/ProjectShellPage.tsx`
  - Test: Terminal interaction, scroll behavior

- [ ] 1.2 [2/10] Migrate auth pages to CenteredLayout (minimal wrapper)
  - LoginPage, SignupPage already use `min-h-screen`
  - Files: `apps/app/src/client/pages/auth/LoginPage.tsx`, `SignupPage.tsx`
  - Test: Responsive centering on mobile/desktop

- [ ] 1.3 [3/10] Migrate content pages to ContentFlowLayout
  - ProjectHomePage, ProjectsPage (no height constraints)
  - Files: `apps/app/src/client/pages/ProjectHomePage.tsx`, `ProjectsPage.tsx`
  - Test: Natural scroll, no layout shifts

- [ ] 1.4 [3/10] Run visual regression checks on Phase 1 pages
  - Verify no layout breaks
  - Test viewports: 375px, 768px, 1280px, 1920px
  - Check scroll behavior, responsive breakpoints

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Standard Pages

**Phase Complexity**: 36 points (avg 4.0/10)

- [ ] 2.1 [4/10] Migrate ProjectSourceControl to StandardPageLayout
  - Tabs + file list scroll
  - File: `apps/app/src/client/pages/projects/source/ProjectSourceControl.tsx`
  - Test: Tab switching, file list scroll

- [ ] 2.2 [4/10] Migrate ProjectSourcePage to StandardPageLayout
  - File: `apps/app/src/client/pages/projects/source/ProjectSourcePage.tsx`
  - Test: File browser scroll

- [ ] 2.3 [3/10] Migrate NewWorkflowRunPage to StandardPageLayout
  - File: `apps/app/src/client/pages/projects/workflows/NewWorkflowRunPage.tsx`

- [ ] 2.4 [4/10] Migrate ProjectWorkflowsListPage to StandardPageLayout
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsListPage.tsx`

- [ ] 2.5 [4/10] Migrate ProjectWebhooksPage to StandardPageLayout
  - File: `apps/app/src/client/pages/projects/webhooks/ProjectWebhooksPage.tsx`

- [ ] 2.6 [5/10] Migrate WebhookDetailPage to StandardPageLayout
  - Complex: nested tabs + sections
  - File: `apps/app/src/client/pages/projects/webhooks/WebhookDetailPage.tsx`
  - May need tab height handling extension

- [ ] 2.7 [4/10] Migrate WebhookFormPage to ContentFlowLayout
  - Form-based, natural scroll
  - File: `apps/app/src/client/pages/projects/webhooks/WebhookFormPage.tsx`

- [ ] 2.8 [4/10] Migrate WorkflowDefinitionPage to KanbanLayout
  - Similar to ProjectWorkflowsPage
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowDefinitionPage.tsx`

- [ ] 2.9 [4/10] Visual regression testing for Phase 2
  - Test all 8 migrated pages
  - Verify scroll, responsive behavior
  - Check tab switching, form submission

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Complex Layouts (High Risk)

**Phase Complexity**: 32 points (avg 8.0/10)

- [ ] 3.1 [9/10] Migrate ProjectWorkflowsPage to KanbanLayout (Trello-style)
  - HIGHEST COMPLEXITY - Most critical scroll bug fix
  - Replace: `flex h-full flex-col` → `grid grid-rows-[auto_auto_1fr]`
  - Horizontal board scroll + vertical column scroll
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsPage.tsx`
  - Test: Board scrolls left-to-right, columns scroll up-down independently
  - Verify: No body scroll, columns fixed width (320px), cards scroll

- [ ] 3.2 [7/10] Update WorkflowKanbanColumn for proper scroll structure
  - Add `grid grid-rows-[auto_1fr]` for header + cards
  - Add `min-h-0` to prevent flex overflow (if needed)
  - Ensure `overflow-y-auto` on cards container
  - File: `apps/app/src/client/pages/projects/workflows/components/WorkflowKanbanColumn.tsx`

- [ ] 3.3 [9/10] Migrate WorkflowRunDetailPage to SplitPaneLayout
  - COMPLEX - Nested grids for timeline + detail panel
  - Two independent scroll regions with tabs
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Test: Left pane scroll (timeline), right pane scroll (tabs)
  - Verify: Tab switching doesn't break scroll

- [ ] 3.4 [7/10] Extensive testing for complex layouts
  - Test ProjectWorkflowsPage: Drag cards between columns (if applicable)
  - Test WorkflowRunDetailPage: Load large timeline, scroll both panes
  - Test responsive: Mobile stacked layout, tablet split
  - Verify: No scroll jank, smooth performance

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: Cleanup & Standardization

**Phase Complexity**: 15 points (avg 3.0/10)

- [ ] 4.1 [3/10] Remove sticky positioning hacks from headers
  - ProjectHeader: Remove `sticky top-0` (Grid handles positioning)
  - SessionHeader: Remove `sticky top-[52px]` (brittle offset)
  - Files: `apps/app/src/client/components/ProjectHeader.tsx`, `SessionHeader.tsx`
  - Grid auto-positions headers via `gridTemplateRows`

- [ ] 4.2 [4/10] Add semantic z-index scale to Tailwind config
  - Add z-background, z-sticky, z-dropdown, z-popover, z-modal, z-fullscreen, z-system
  - File: `apps/app/tailwind.config.js`
  - Reference: Design decisions section for scale values

- [ ] 4.3 [4/10] Update UI components with semantic z-index
  - Migrate 26 components from z-50, z-10 to semantic values
  - Dialog, Sheet, Popover, Tooltip, Dropdown, etc.
  - Files: `apps/app/src/client/components/ui/*.tsx`
  - Use search/replace: `z-50` → appropriate semantic class

- [ ] 4.4 [2/10] Remove `min-h-0` flex hacks (12 instances)
  - No longer needed with Grid
  - Search codebase: `rg "min-h-0" --glob "*.tsx"`
  - Review each instance, remove if Grid-based parent

- [ ] 4.5 [2/10] Fix remaining `flex-1 overflow-y-auto` without height (45 instances)
  - Pattern: `flex-1 overflow-y-auto` → `overflow-y-auto` (Grid provides height)
  - Automated search: `rg "flex-1 overflow-y-auto"`
  - Manual review required (some may be intentional)

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 5: Documentation

**Phase Complexity**: 9 points (avg 2.3/10)

- [ ] 5.1 [3/10] Create comprehensive layout guide
  - File: `.agent/docs/frontend-layout.md`
  - Sections: When to use each pattern, Grid vs Flex decision tree, height constraint chains, migration examples
  - Include Trello-style kanban explanation

- [ ] 5.2 [2/10] Update client CLAUDE.md with Grid conventions
  - Add Grid layout pattern conventions
  - Document z-index semantic system
  - Link to frontend-layout.md
  - File: `apps/app/src/client/CLAUDE.md`

- [ ] 5.3 [2/10] Add inline documentation to pattern components
  - JSDoc comments explaining when to use each pattern
  - Examples of props usage
  - Files: All 6 pattern components in `layouts/patterns/`

- [ ] 5.4 [2/10] Create migration checklist for future pages
  - Quick reference: "Which layout pattern should I use?"
  - Common pitfalls to avoid
  - Add to frontend-layout.md

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

Not applicable - this is a layout/CSS refactoring with no business logic changes.

### Integration Tests

Not applicable - visual regression testing covers integration.

### Visual Regression Tests

**Critical Test Pages** (test at each phase):

1. **ProjectSessionPage** (already Grid) - Ensure no regression
2. **ProjectWorkflowsPage** (Phase 3) - Kanban scroll bug fix validation
3. **WorkflowRunDetailPage** (Phase 3) - Split-pane scroll validation
4. **ProjectSourceControl** (Phase 2) - Tab switching + scroll
5. **LoginPage** (Phase 1) - Centering validation

**Test Viewports**:
- Mobile: 375px, 425px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1920px

**Test Scenarios**:
1. Scroll behavior in each pane (body scroll vs internal scroll)
2. Header positioning (sticky vs Grid auto-position)
3. Footer/input positioning (sticky vs Grid auto-position)
4. Modal/dialog overlays (z-index stacking)
5. Responsive breakpoint transitions (Grid responsiveness)
6. Kanban horizontal scroll (board left-to-right, columns up-down)
7. Split-pane independent scroll (both panes scroll separately)

**Manual Testing Checklist**:
- [ ] Chat messages scroll internally (not body)
- [ ] Kanban board scrolls left-to-right, columns scroll up-down
- [ ] Split-pane: timeline scrolls, detail panel scrolls independently
- [ ] Headers stay fixed at top (no disappearing on scroll)
- [ ] Input stays fixed at bottom (no scrolling away)
- [ ] Modals appear above all content (z-index correct)
- [ ] Mobile responsive: layouts stack correctly
- [ ] No double scrollbars
- [ ] No scroll jank or performance issues

## Success Criteria

- [ ] All 23 pages migrated to one of 6 standard patterns
- [ ] Kanban scroll bug fixed (board scrolls horizontally, columns scroll vertically)
- [ ] Split-pane scroll works independently in both panes
- [ ] No `h-full` without Grid parent height constraint
- [ ] No `flex-1 overflow-y-auto` without explicit height
- [ ] ProjectLoader simplified from ~92 lines to ~30 lines
- [ ] All 12 `min-h-0` hacks removed
- [ ] Z-index system standardized (26 components updated)
- [ ] No sticky positioning with hardcoded offsets (5 instances removed)
- [ ] Type checking passes: `pnpm check-types`
- [ ] Build succeeds: `pnpm build`
- [ ] No console errors on any page
- [ ] Visual regression tests pass for all critical pages
- [ ] Documentation complete (frontend-layout.md + CLAUDE.md updated)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Build verification
pnpm --filter app build
# Expected: Successful build, no errors

# Linting
pnpm --filter app lint
# Expected: No lint errors
```

**Manual Verification:**

1. Start application: `pnpm --filter app dev`
2. Test ProjectWorkflowsPage:
   - Navigate to: `/projects/{projectId}/workflows`
   - Verify: Board scrolls left-to-right (horizontal)
   - Verify: Columns scroll up-down (vertical) independently
   - Verify: No body scroll
   - Check console: No errors

3. Test WorkflowRunDetailPage:
   - Navigate to: `/projects/{projectId}/workflows/{defId}/{runId}`
   - Verify: Left pane (timeline) scrolls independently
   - Verify: Right pane (details) scrolls independently
   - Verify: Tab switching works, scroll persists
   - Check console: No errors

4. Test ProjectSessionPage (regression check):
   - Navigate to: `/projects/{projectId}/sessions/{sessionId}`
   - Verify: Messages scroll internally (not body)
   - Verify: Headers stay fixed at top
   - Verify: Input stays fixed at bottom
   - Check console: No errors

5. Test responsive layouts:
   - Resize browser to mobile (375px)
   - Verify: Kanban columns stack vertically (if responsive)
   - Verify: Split-pane becomes single column
   - Verify: Headers/footers still work correctly

**Feature-Specific Checks:**

- Open browser DevTools, check for:
  - No `overflow: hidden` on `<body>`
  - No double scrollbars anywhere
  - Grid rows inspect: verify `gridTemplateRows` values correct
- Test z-index stacking:
  - Open modal → should appear above all content
  - Open dropdown from sticky header → should appear above modal
  - Open tooltip → should appear above dropdown
- Performance check:
  - Scroll large kanban board (100+ cards) → smooth, no jank
  - Scroll large timeline → smooth, no jank

## Implementation Notes

### 1. Critical Blocker - ProjectLoader Height Chain

**Context**: The audit found that ProjectLoader uses `isWorkflowRoute ? "h-screen" : "h-full"`, but SidebarInset has no height set. This creates an inconsistent height base for all child pages.

**Why it's critical**: Every page migration depends on predictable height from parent. Without fixing this first, Grid layouts will have undefined behavior.

**Fix order**: Phase 0 Task 0.1 (AppLayout) → Task 0.2 (ProjectLoader) MUST complete before any page migrations.

### 2. Grid `1fr` vs Flex `flex-1` (Key Insight)

**Grid `1fr`**: "Exactly the remaining space, no more, no less" → enables internal scroll
**Flex `flex-1`**: "Grow to fit content" → breaks scroll, causes body scroll

This is why kanban columns currently scroll the whole body instead of internally. Grid establishes height authority through `gridTemplateRows`.

### 3. Trello-Style Kanban Requirements

**Horizontal scroll**: Board container needs `overflow-x-auto overflow-y-hidden`
**Vertical scroll**: Each column needs `overflow-y-auto` on cards container
**Fixed width**: Columns need `w-[320px] flex-shrink-0` to prevent shrinking
**No wrapping**: Use `min-w-max` on flex wrapper to prevent column wrapping

### 4. Z-Index Semantic System Rationale

**Problem**: Currently 24 components use `z-50` for everything (modals, dropdowns, file viewers). Potential for conflicts if file viewer opens while modal is open.

**Solution**: Semantic scale creates clear hierarchy:
- Sticky elements: z-10
- Dropdowns: z-20
- Popovers: z-30
- Modals: z-50
- Full-screen overlays: z-60
- System alerts: z-100

### 5. Automated vs Manual Migration

**Automated** (search/replace safe):
- `min-h-0` removal (if parent is Grid)
- Z-index value replacement (`z-50` → semantic)

**Manual** (requires review):
- `flex-1 overflow-y-auto` (some may be intentional)
- Page component conversions (need to test each)
- Sticky positioning removal (verify Grid handles it)

## Dependencies

- No new npm packages required
- Tailwind CSS v4 (already installed)
- React 19 (already installed)

## References

- Tailwind Grid Documentation: https://tailwindcss.com/docs/grid-template-rows
- CSS Grid Layout Module: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout
- Audit Report: Chat history (comprehensive analysis of 23 pages, 45+ conflicts identified)
- ProjectSessionPage: Reference implementation of Grid layout (already working)

## Next Steps

1. Review and approve this spec
2. Begin Phase 0: Fix AppLayout and ProjectLoader (critical blocker)
3. Create 6 pattern components in `layouts/patterns/`
4. Start Phase 1: Migrate low-risk pages to validate approach
5. Progress through phases 2-5 incrementally
6. Conduct visual regression testing at each phase
7. Update documentation upon completion
