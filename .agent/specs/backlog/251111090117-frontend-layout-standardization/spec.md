# Frontend Layout & Component Standardization

**Status**: draft
**Created**: 2025-11-11
**Package**: apps/app
**Total Complexity**: 156 points
**Phases**: 4
**Tasks**: 27
**Overall Avg Complexity**: 5.8/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Core Infrastructure | 7 | 38 | 5.4/10 | 7/10 |
| Phase 2: Page Migration | 13 | 78 | 6.0/10 | 8/10 |
| Phase 3: Component Enhancement | 4 | 20 | 5.0/10 | 6/10 |
| Phase 4: Polish & Audit | 3 | 20 | 6.7/10 | 8/10 |
| **Total** | **27** | **156** | **5.8/10** | **8/10** |

## Overview

Standardize frontend layout patterns, component structure, and spacing across the entire application to create consistent user experience and improve maintainability. Currently the app has inconsistent padding, mixed width constraints, 3 different form patterns, 4 card variants, and varying spacing scales.

## User Story

As a developer maintaining the frontend
I want consistent layout patterns and reusable components
So that the UI feels cohesive and new features follow established patterns automatically

## Technical Approach

Create core layout infrastructure components (`PageLayout`, `PageHeader`, `PageBody`) that enforce standard spacing and width constraints. Migrate existing Field components throughout forms. Extend Card with variant system. Apply consistent spacing scale (`p-4`, `space-y-6`, `gap-4`) across all pages. Decisions incorporate: constrained projects grid (`max-w-7xl`), `hover:bg-accent/50` for cards, `md: 500px` default dialogs, mobile labels visible, simple icons for empty states.

## Key Design Decisions

1. **Three Layout Variants**: Full-width (`px-6 py-4 lg:px-8`) for data-dense UIs, constrained (`max-w-4xl`) for reading content, wide (`max-w-7xl`) for grid layouts - prevents awkward ultra-wide spacing
2. **Existing Field Components**: Migrate to already-built Field/FieldLabel/FieldError pattern instead of creating new wrapper - leverages shadcn composition pattern
3. **Background Hover States**: Use `hover:bg-accent/50` instead of shadows for card interactivity - more subtle, better accessibility, cleaner dark mode
4. **Spacing Scale Standardization**: Card padding (`p-4` default, `p-6` large), section gaps (`space-y-6`), grid gaps (`gap-4`) - reduces cognitive load
5. **Mobile-First Actions**: Keep button labels visible on mobile, stack vertically if needed - better discoverability vs icon-only

## Architecture

### File Structure

```
apps/app/src/client/
├── components/
│   ├── layout/
│   │   ├── PageLayout.tsx          # NEW: Main layout wrapper
│   │   ├── PageHeader.tsx          # NEW: Page title/actions
│   │   ├── PageBody.tsx            # NEW: Content wrapper
│   │   ├── SectionHeader.tsx       # NEW: Section headers
│   │   ├── ActionGroup.tsx         # NEW: Button groups
│   │   └── Breadcrumb.tsx          # NEW: Breadcrumb nav
│   ├── ui/
│   │   ├── card.tsx                # MODIFIED: Add variants
│   │   ├── dialog.tsx              # MODIFIED: Add DialogBody, size presets
│   │   ├── field.tsx               # EXISTING: Already built
│   │   ├── list.tsx                # NEW: List wrapper (optional)
│   │   └── empty.tsx               # EXISTING: Standardize usage
│   └── ...
├── pages/
│   ├── projects/
│   │   ├── Projects.tsx            # MODIFIED: Wide layout, grid standardization
│   │   ├── ProjectHome.tsx         # MODIFIED: Wide layout, section headers
│   │   ├── workflows/
│   │   │   ├── ProjectWorkflowsView.tsx  # MODIFIED: Full-width layout
│   │   │   └── WorkflowRunDetail.tsx     # MODIFIED: Section headers
│   │   ├── sessions/
│   │   │   └── ProjectSession.tsx        # MODIFIED: Constrained layout
│   │   ├── files/
│   │   │   └── ProjectSource.tsx         # MODIFIED: Full-width layout
│   │   └── shell/
│   │       └── ProjectShell.tsx          # MODIFIED: Full-width layout
│   └── ...
└── ...
```

### Integration Points

**Layout System**:
- All page components wrap content in `PageLayout`
- Page headers use `PageHeader` for consistency
- Section headers use `SectionHeader`

**Form System**:
- All dialogs migrate to `Field` components
- `DialogBody` standardizes dialog content
- Consistent error/validation display

**Card System**:
- Interactive cards use `variant="interactive"`
- List items use `variant="list-item"`
- Hover states unified to `hover:bg-accent/50`

## Implementation Details

### 1. PageLayout Component

Main layout wrapper that enforces width constraints and spacing patterns.

**Key Points**:
- Three variants: `full` (workflows/files), `constrained` (chat), `wide` (projects grid)
- Standard padding: Base `px-6 py-4`, desktop `lg:px-8 lg:py-6`
- Max-width logic: full=none, constrained=`max-w-4xl`, wide=`max-w-7xl`
- Handles vertical spacing between page sections

### 2. PageHeader Component

Unified page title bar with actions and optional breadcrumb.

**Key Points**:
- Props: title (required), description (optional), actions (ReactNode), breadcrumb (ReactNode)
- Standard styling: `text-2xl font-bold`, `pb-4 border-b`
- Actions: Flexbox with `gap-2`, responsive stack `flex-col sm:flex-row`
- Mobile: Keep button labels visible

### 3. Card Variant System

Extend existing Card component with interactive states.

**Key Points**:
- Add `variant` prop: `default`, `interactive`, `list-item`
- Interactive: `hover:bg-accent/50 cursor-pointer transition-colors`
- List-item: Compact padding `p-3` instead of `p-6`
- Standardize default padding to `p-4`, large to `p-6`

### 4. DialogBody Component

Standard content wrapper for dialogs with padding and scroll handling.

**Key Points**:
- Props: `scrollable` (boolean), `className`
- Default padding: `px-6 py-4`
- Scrollable: `max-h-[60vh] overflow-y-auto`
- Inner spacing: `space-y-4`
- Update BaseDialog with size presets: `sm: 400px`, `md: 500px` (default), `lg: 650px`, `xl: 800px`

### 5. Field Component Migration

Replace all manual Label + Input patterns with existing Field components.

**Key Points**:
- Pattern: `<Field> <FieldLabel> <Input> <FieldError>`
- Already built in `components/ui/field.tsx`
- Handles error display, spacing, accessibility
- Used in auth forms, needs migration to all dialogs

## Files to Create/Modify

### New Files (7)

1. `apps/app/src/client/components/layout/PageLayout.tsx` - Main layout wrapper with variants
2. `apps/app/src/client/components/layout/PageHeader.tsx` - Page title and actions
3. `apps/app/src/client/components/layout/PageBody.tsx` - Content wrapper with spacing
4. `apps/app/src/client/components/layout/SectionHeader.tsx` - Section-level headers
5. `apps/app/src/client/components/layout/ActionGroup.tsx` - Button group wrapper
6. `apps/app/src/client/components/layout/Breadcrumb.tsx` - Breadcrumb navigation
7. `apps/app/src/client/components/ui/list.tsx` - List wrapper (optional)

### Modified Files (20)

1. `apps/app/src/client/components/ui/card.tsx` - Add variant prop and interactive styles
2. `apps/app/src/client/components/ui/dialog.tsx` - Add DialogBody component and size presets
3. `apps/app/src/client/pages/projects/Projects.tsx` - PageLayout wide, grid standardization
4. `apps/app/src/client/pages/projects/ProjectHome.tsx` - PageLayout wide, SectionHeader
5. `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx` - PageLayout full
6. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetail.tsx` - SectionHeader usage
7. `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx` - PageLayout constrained
8. `apps/app/src/client/pages/projects/files/ProjectSource.tsx` - PageLayout full
9. `apps/app/src/client/pages/projects/shell/ProjectShell.tsx` - PageLayout full
10. `apps/app/src/client/components/dialogs/ProjectDialog.tsx` - Field components, DialogBody
11. `apps/app/src/client/components/dialogs/CreateBranchDialog.tsx` - Field components
12. `apps/app/src/client/components/dialogs/CreatePullRequestDialog.tsx` - Field components
13. `apps/app/src/client/components/dialogs/SessionDialog.tsx` - Field components
14. `apps/app/src/client/pages/projects/workflows/components/NewRunDialog.tsx` - Field components, size="lg"
15. `apps/app/src/client/pages/projects/workflows/components/WorkflowAccordionSection.tsx` - Card variant usage
16. `apps/app/src/client/pages/projects/sessions/components/SessionListItem.tsx` - Card variant usage
17. `apps/app/src/client/pages/projects/workflows/components/WorkflowRunCard.tsx` - Card variant usage
18. Multiple empty state usages - Ensure consistent icon patterns
19. Various components using manual spacing - Apply spacing scale
20. Various components with responsive breakpoints - Ensure md/lg consistency

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Core Layout Infrastructure

**Phase Complexity**: 38 points (avg 5.4/10)

<!-- prettier-ignore -->
- [ ] layout-001 [4/10] Create PageLayout component with variant system
  - Three variants: full, constrained, wide
  - Full: `px-6 py-4 lg:px-8 lg:py-6` no max-width
  - Constrained: `max-w-4xl mx-auto px-6 py-4`
  - Wide: `max-w-7xl mx-auto px-6 py-4`
  - File: `apps/app/src/client/components/layout/PageLayout.tsx`
  - Export from `apps/app/src/client/components/layout/index.ts`

- [ ] layout-002 [5/10] Create PageHeader component
  - Props: title, description, actions, breadcrumb (all optional except title)
  - Title: `text-2xl font-bold`
  - Actions: `flex gap-2 flex-col sm:flex-row` for responsive stacking
  - Border bottom: `pb-4 border-b`
  - File: `apps/app/src/client/components/layout/PageHeader.tsx`

- [ ] layout-003 [4/10] Create PageBody component
  - Standard content wrapper with `space-y-6` between sections
  - Optional scrollable prop for overflow handling
  - File: `apps/app/src/client/components/layout/PageBody.tsx`

- [ ] layout-004 [5/10] Create SectionHeader component
  - Props: title, count, icon, action
  - Title: `text-lg font-semibold`
  - Optional count badge, Lucide icon support
  - Right-aligned action button area
  - File: `apps/app/src/client/components/layout/SectionHeader.tsx`

- [ ] layout-005 [6/10] Extend Card component with variant system
  - Add variant prop: default, interactive, list-item
  - Interactive: `hover:bg-accent/50 cursor-pointer transition-colors`
  - List-item: Compact padding `p-3`
  - Standardize default padding to `p-4`, CardContent `p-6` for large
  - File: `apps/app/src/client/components/ui/card.tsx`

- [ ] layout-006 [7/10] Update BaseDialog and create DialogBody component
  - Add size prop to BaseDialog: sm (400px), md (500px default), lg (650px), xl (800px)
  - Create DialogBody with standard padding `px-6 py-4`
  - Add scrollable prop: `max-h-[60vh] overflow-y-auto`
  - Inner spacing: `space-y-4`
  - File: `apps/app/src/client/components/ui/dialog.tsx`

- [ ] layout-007 [7/10] Create ActionGroup and Breadcrumb components
  - ActionGroup: Button wrapper with `flex gap-2 flex-col sm:flex-row`
  - Breadcrumb: Simple chevron-separated navigation with truncation
  - File: `apps/app/src/client/components/layout/ActionGroup.tsx`
  - File: `apps/app/src/client/components/layout/Breadcrumb.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Migrate Pages to New Layout System

**Phase Complexity**: 78 points (avg 6.0/10)

<!-- prettier-ignore -->
- [ ] migrate-001 [5/10] Migrate ProjectWorkflowsView to full-width layout
  - Wrap in `<PageLayout variant="full">`
  - Replace header with `<PageHeader title="Workflows" actions={...} />`
  - Standardize padding, remove manual `p-4` classes
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx`

- [ ] migrate-002 [6/10] Migrate WorkflowRunDetail to use SectionHeader
  - Wrap in `<PageLayout variant="full">`
  - Use `<SectionHeader>` for "Progress", "Actions", "Output" sections
  - Standardize spacing between sections to `space-y-6`
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetail.tsx`

- [ ] migrate-003 [5/10] Migrate ProjectSource to full-width layout
  - Wrap in `<PageLayout variant="full">`
  - Use `<PageHeader>` for navigation header
  - File: `apps/app/src/client/pages/projects/files/ProjectSource.tsx`

- [ ] migrate-004 [5/10] Migrate ProjectShell to full-width layout
  - Wrap in `<PageLayout variant="full">`
  - Terminal needs full horizontal space
  - File: `apps/app/src/client/pages/projects/shell/ProjectShell.tsx`

- [ ] migrate-005 [6/10] Migrate Projects list to wide constrained layout
  - Wrap in `<PageLayout variant="wide">`
  - Use `<PageHeader title="Projects" actions={...} />`
  - Standardize grid: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`
  - Update cards to use `variant="interactive"`
  - File: `apps/app/src/client/pages/projects/Projects.tsx`

- [ ] migrate-006 [7/10] Migrate ProjectHome to wide layout with sections
  - Wrap in `<PageLayout variant="wide">`
  - Use `<SectionHeader>` for "Recent Sessions", "Workflows", etc.
  - Standardize card grids to `gap-4`
  - Apply `space-y-6` between major sections
  - File: `apps/app/src/client/pages/projects/ProjectHome.tsx`

- [ ] migrate-007 [8/10] Migrate ProjectSession to constrained layout
  - Wrap chat input area in `<PageLayout variant="constrained">`
  - Messages can be full-width, input constrained to `max-w-4xl`
  - May require hybrid approach: full-width page, constrained input section
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`

- [ ] migrate-008 [5/10] Migrate ProjectDialog to Field components
  - Replace `<Label> + <Input>` with `<Field><FieldLabel><Input><FieldError>`
  - Use `<DialogBody>` wrapper for content
  - Update error display to use `<FieldError>`
  - File: `apps/app/src/client/components/dialogs/ProjectDialog.tsx`

- [ ] migrate-009 [5/10] Migrate CreateBranchDialog to Field components
  - Replace manual form fields with Field components
  - Add `<DialogBody>` wrapper
  - File: `apps/app/src/client/components/dialogs/CreateBranchDialog.tsx`

- [ ] migrate-010 [5/10] Migrate CreatePullRequestDialog to Field components
  - Replace manual form fields with Field components
  - Add `<DialogBody>` wrapper
  - File: `apps/app/src/client/components/dialogs/CreatePullRequestDialog.tsx`

- [ ] migrate-011 [5/10] Migrate SessionDialog to Field components
  - Replace manual form fields with Field components
  - Add `<DialogBody>` wrapper
  - File: `apps/app/src/client/components/dialogs/SessionDialog.tsx`

- [ ] migrate-012 [6/10] Migrate NewRunDialog to Field components with large size
  - Replace manual form fields with Field components
  - Set dialog `size="lg"` for workflow selection
  - Add `<DialogBody scrollable>` for long workflow lists
  - File: `apps/app/src/client/pages/projects/workflows/components/NewRunDialog.tsx`

- [ ] migrate-013 [10/10] Audit and update all card usages to new variant system
  - WorkflowAccordionSection: May need custom collapsible pattern
  - SessionListItem: Use `variant="list-item"` or `variant="interactive"`
  - WorkflowRunCard: Use `variant="interactive"` with `hover:bg-accent/50`
  - Audit all Card usages across codebase
  - Files: Multiple (WorkflowAccordionSection.tsx, SessionListItem.tsx, WorkflowRunCard.tsx, others)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Component Enhancement & Standardization

**Phase Complexity**: 20 points (avg 5.0/10)

<!-- prettier-ignore -->
- [ ] enhance-001 [6/10] Audit empty states across all pages
  - Ensure all use `<Empty>` component
  - Add simple Lucide icons (no complex illustrations)
  - Standard pattern: icon, title, description, optional action
  - Files: Multiple pages with empty states (workflows, sessions, files)

- [ ] enhance-002 [5/10] Audit and unify status badge patterns
  - Workflow status badges: Use consistent Badge variants
  - Session status indicators: Unify colors and styles
  - Ensure accessible color contrast
  - Files: WorkflowRunCard.tsx, SessionListItem.tsx, status components

- [ ] enhance-003 [4/10] Create optional List component
  - Props: spacing (2|3|4), dividers (boolean)
  - Standardize vertical list spacing patterns
  - File: `apps/app/src/client/components/ui/list.tsx`

- [ ] enhance-004 [5/10] Update ActionGroup usage in headers and dialogs
  - Replace manual button groups with `<ActionGroup>`
  - Ensures consistent `gap-2` and responsive stacking
  - Files: Multiple headers and dialog footers

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Polish & Final Audit

**Phase Complexity**: 20 points (avg 6.7/10)

<!-- prettier-ignore -->
- [ ] polish-001 [8/10] Comprehensive spacing audit across entire codebase
  - Card padding: Ensure `p-4` default, `p-6` for CardContent
  - Section gaps: Ensure `space-y-6` between major sections
  - Grid gaps: Ensure `gap-4` for card grids
  - Inner spacing: Ensure `space-y-3` within cards/sections
  - Replace all inconsistent padding (p-2, p-5, etc.)
  - Files: All page and component files

- [ ] polish-002 [6/10] Responsive breakpoint consistency audit
  - Ensure md (768px) and lg (1024px) usage is consistent
  - Check all responsive padding: `p-4 md:p-6 lg:px-8`
  - Check all responsive text: `text-xl md:text-2xl`
  - Files: All page and component files

- [ ] polish-003 [6/10] Card hover state unification
  - Replace all `hover:shadow-md` with `hover:bg-accent/50`
  - Add `transition-colors` for smooth hover
  - Ensure cursor-pointer on interactive cards
  - Files: All card components

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Manual Testing

**Layout Responsiveness**:
- Test all pages at mobile (375px), tablet (768px), desktop (1440px), ultra-wide (2560px)
- Verify max-width constraints work correctly
- Check button stacking on mobile
- Verify horizontal scrolling does not occur unexpectedly

**Component Consistency**:
- Audit spacing: Use browser DevTools to measure padding/margins
- Check card hover states are smooth and consistent
- Verify form field error states display correctly
- Check empty states show icons and actions

**Cross-Browser**:
- Chrome, Firefox, Safari
- Check hover states, transitions, layout shifts

### Visual Regression

Before/after screenshots of:
- Projects grid page
- Workflow kanban view
- Workflow run detail
- Chat session
- File browser
- All dialogs (ProjectDialog, NewRunDialog, etc.)

### Accessibility

- Keyboard navigation works for all interactive cards
- Focus states visible
- Form errors announced by screen readers
- Color contrast meets WCAG AA standards

## Success Criteria

- [ ] All pages use PageLayout wrapper with appropriate variant
- [ ] All page headers use PageHeader component
- [ ] All section headers use SectionHeader component
- [ ] All forms use Field/FieldLabel/FieldError pattern
- [ ] All dialogs use DialogBody with standard padding
- [ ] All interactive cards use variant="interactive" with hover:bg-accent/50
- [ ] All card padding standardized to p-4 (default) or p-6 (large)
- [ ] All section spacing uses space-y-6
- [ ] All grid spacing uses gap-4
- [ ] All empty states use Empty component with simple icons
- [ ] No inconsistent padding values (p-2, p-5, px-3 py-2.5, etc.)
- [ ] No inconsistent hover states (shadow-md, border changes)
- [ ] Mobile responsive: Button labels visible, proper stacking
- [ ] Ultra-wide responsive: Content not stretched awkwardly
- [ ] Type checking passes: pnpm check-types
- [ ] No new linting errors: pnpm lint
- [ ] Visual regression tests pass (manual comparison)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Linting
pnpm --filter app lint
# Expected: No new lint errors (may have existing)

# Build verification
pnpm --filter app build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm --filter app dev`
2. Navigate to: `http://localhost:5173`
3. Verify Projects page:
   - Layout constrained to max-w-7xl
   - Grid uses gap-4 spacing
   - Cards have hover:bg-accent/50 on hover
   - PageHeader with title and actions visible
4. Verify Workflows page:
   - Full-width layout with proper padding (px-6 py-4)
   - Kanban columns use consistent gap-4
   - Run cards have interactive hover states
5. Verify Chat/Session page:
   - Input area constrained to max-w-4xl
   - Messages area can be full-width
   - Proper vertical spacing
6. Verify File browser and Terminal:
   - Full-width layouts
   - Proper horizontal padding (px-6 lg:px-8)
7. Test all dialogs:
   - ProjectDialog: Field components, DialogBody, md size (500px)
   - NewRunDialog: Field components, lg size (650px)
   - CreateBranchDialog: Field components, md size
   - All use consistent spacing (space-y-4)
8. Test responsive behavior:
   - Resize to mobile (375px): Button labels visible, cards stack properly
   - Resize to tablet (768px): Grid adapts to 2 columns
   - Resize to desktop (1440px): Grid shows 3 columns
   - Resize to ultra-wide (2560px): Content properly constrained
9. Test empty states:
   - View empty workflows, sessions, files
   - Verify simple Lucide icons displayed
   - Verify action buttons present
10. Check console: No errors or warnings related to layout components

**Spacing Verification with DevTools:**

1. Open Chrome DevTools (F12)
2. Inspect various cards: Verify padding is p-4 or p-6
3. Inspect page sections: Verify space-y-6 between major sections
4. Inspect grids: Verify gap-4 spacing
5. Inspect dialogs: Verify DialogBody has px-6 py-4

**Feature-Specific Checks:**

- PageLayout variant="full": No max-width applied
- PageLayout variant="constrained": max-w-4xl applied and centered
- PageLayout variant="wide": max-w-7xl applied and centered
- Card hover transitions: Smooth color change, no layout shift
- Dialog sizes: sm=400px, md=500px (default), lg=650px
- Field components: Errors display with proper styling
- ActionGroup: Buttons stack vertically on mobile, horizontal on desktop

## Implementation Notes

### 1. Hybrid Layouts for Chat

ProjectSession may need a hybrid approach where the page itself is full-width but the chat input area is wrapped in a constrained container. This allows messages to use available space while keeping input readable.

### 2. Card Variant Composition

The Card component should remain composable. Interactive and list-item variants should work with existing CardHeader, CardContent, CardFooter composition.

### 3. Dialog Size Inheritance

DialogBody should respect the parent dialog size. Scrollable prop should only add overflow handling, not change padding.

### 4. Migration Strategy

Migrate pages incrementally, testing each page after conversion. Start with simpler pages (Projects, Source) before tackling complex layouts (Workflows, Session).

### 5. Empty State Icons

Use Lucide icons that match the content type: `Workflow` for workflows, `MessageSquare` for sessions, `FileText` for files. Keep them simple and monochrome.

## Dependencies

- No new dependencies required
- Uses existing shadcn/ui components (Card, Dialog, Label, Input, Button)
- Uses existing Lucide icons
- Uses existing Tailwind CSS utilities

## References

- shadcn/ui Card: https://ui.shadcn.com/docs/components/card
- shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog
- Tailwind CSS spacing: https://tailwindcss.com/docs/padding
- Lucide icons: https://lucide.dev/icons

## Next Steps

1. Review spec and approve complexity estimates
2. Run `/cmd:implement-spec 251111090117` to begin Phase 1
3. Test each phase thoroughly before moving to next
4. Conduct visual regression testing after Phase 2
5. Final audit and polish in Phase 4
6. Update documentation with new layout patterns
