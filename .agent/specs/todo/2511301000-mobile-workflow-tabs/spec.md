# Mobile Tabs for Workflow Run Page

**Status**: draft
**Created**: 2025-11-30
**Package**: apps/app
**Total Complexity**: 52 points
**Phases**: 4
**Tasks**: 12
**Overall Avg Complexity**: 4.3/10

## Complexity Breakdown

| Phase                     | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Header Layout    | 2     | 6            | 3.0/10         | 4/10     |
| Phase 2: Mobile Tabs      | 5     | 26           | 5.2/10         | 7/10     |
| Phase 3: State Sync       | 2     | 8            | 4.0/10         | 5/10     |
| Phase 4: Testing & Polish | 3     | 12           | 4.0/10         | 5/10     |
| **Total**                 | **12**| **52**       | **4.3/10**     | **7/10** |

## Overview

Add mobile-responsive tab navigation to workflow run detail page, allowing users to switch between Timeline and detail panel content (Details, Logs, Artifacts) on small screens. Desktop layout remains unchanged with two-column split-pane design.

## User Story

As a mobile user
I want to view workflow run details and logs on my phone
So that I can monitor workflow execution without needing desktop access

## Technical Approach

Implement responsive design pattern using `useIsMobile` hook with 768px breakpoint. On mobile, flatten navigation to 4 top-level tabs (Timeline | Details | Logs | Artifacts) displayed below page header. Reuse existing tab content components without extraction. Desktop retains existing two-column grid layout.

## Key Design Decisions

1. **Flatten tabs on mobile**: Avoid nested tab hierarchy by elevating detail panel tabs to top level alongside Timeline tab
2. **Hide Session tab**: Session content opens in modal from timeline, so omit from mobile tab navigation
3. **Component reuse**: Import existing tab components (DetailsTab, LogsTab, ArtifactsTab) directly without creating wrapper abstractions
4. **Header layout change**: Move status badge to same line as title (right-aligned) to save vertical space on mobile

## Architecture

### File Structure
```
apps/app/src/client/
├── components/
│   └── PageHeader.tsx                     # Modified: title/badge layout
├── pages/projects/workflows/
│   ├── WorkflowRunDetailPage.tsx          # Modified: add mobile tabs
│   └── components/detail-panel/
│       ├── DetailsTab.tsx                 # Reused: imported directly on mobile
│       ├── LogsTab.tsx                    # Reused: imported directly on mobile
│       ├── ArtifactsTab.tsx               # Reused: imported directly on mobile
│       └── WorkflowDetailPanel.tsx        # Unchanged: used on desktop only
```

### Integration Points

**PageHeader Component**:
- `PageHeader.tsx` - Change title/afterTitle layout to single line with space-between
- Add support for mobile tab content in `belowHeader` prop

**Workflow Run Page**:
- `WorkflowRunDetailPage.tsx` - Add `useIsMobile` hook, conditional rendering for mobile/desktop
- Import individual tab components directly
- Add mobile tab state management
- Sync mobile tab with detail panel tab state

## Implementation Details

### 1. PageHeader Layout Modification

Restructure header layout to display title and status badges on single line with title truncation.

**Key Points**:
- Title uses `truncate min-w-0` for ellipsis overflow
- afterTitle wrapped with `flex-shrink-0` to prevent badge squashing
- Actions moved below title (already hidden on mobile)
- Maintains responsive behavior for desktop

### 2. Mobile Tab Navigation

Add flattened tab navigation below header on mobile using PageHeader's `belowHeader` prop.

**Key Points**:
- 4 tabs: Timeline | Details | Logs | Artifacts
- Grid layout with equal width columns
- Only rendered when `isMobile` is true
- Uses existing Tabs component from Radix UI

### 3. Content Area Refactoring

Replace grid layout with conditional rendering based on `isMobile` state. Desktop uses existing two-column grid, mobile uses Radix Tabs with TabsContent for each view.

**Key Points**:
- Desktop: unchanged grid with PhaseTimeline and WorkflowDetailPanel
- Mobile: Tabs component wrapping 4 TabsContent sections
- Each mobile tab content includes proper overflow handling
- Direct import of tab components (DetailsTab, LogsTab, ArtifactsTab)

### 4. State Synchronization

Sync mobile tab selection with detail panel's active tab state to handle timeline item clicks that should switch tabs.

**Key Points**:
- useEffect syncs `activeTab` → `mobileTab` on mobile
- PhaseTimeline's `onSetActiveTab` callback maps detail tabs to mobile tabs
- Session tab excluded (opens modal, doesn't switch to tab)

## Files to Create/Modify

### New Files (0)

No new files required.

### Modified Files (2)

1. `apps/app/src/client/components/PageHeader.tsx` - Change title/badge layout to single line
2. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx` - Add mobile tab navigation and conditional rendering

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Header Layout Changes

**Phase Complexity**: 6 points (avg 3.0/10)

- [ ] 1.1 [2/10] Modify PageHeader title/badge layout to single line
  - Change flex container from `flex-col md:flex-row` to always `flex items-center justify-between`
  - Apply `truncate min-w-0` to h1 for ellipsis overflow
  - Wrap afterTitle in flex container with `flex-shrink-0` to prevent squashing
  - File: `apps/app/src/client/components/PageHeader.tsx`
  - Lines to modify: 81-86

- [ ] 1.2 [4/10] Move actions below title and test responsive behavior
  - Relocate actions div outside title container
  - Keep `hidden md:flex` class for desktop-only visibility
  - Test with long titles and multiple badges
  - File: `apps/app/src/client/components/PageHeader.tsx`
  - Verify: Title truncates, badges stay on same line, actions below on desktop

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Mobile Tab Navigation

**Phase Complexity**: 26 points (avg 5.2/10)

- [ ] 2.1 [3/10] Add mobile hook and state to WorkflowRunDetailPage
  - Import `useIsMobile` from `@/client/hooks/use-mobile`
  - Add `const isMobile = useIsMobile();` after existing hooks
  - Add `const [mobileTab, setMobileTab] = useState<"timeline" | "details" | "logs" | "artifacts">("timeline");`
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Lines: After line 51 (after useWorkflowDetailPanel)

- [ ] 2.2 [4/10] Import Tabs components and individual tab components
  - Add `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/client/components/ui/tabs";`
  - Add `import { DetailsTab } from "./components/detail-panel/DetailsTab";`
  - Add `import { LogsTab } from "./components/detail-panel/LogsTab";`
  - Add `import { ArtifactsTab } from "./components/detail-panel/ArtifactsTab";`
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Lines: Import section (lines 1-29)

- [ ] 2.3 [4/10] Add mobile tabs to PageHeader belowHeader prop
  - Add `belowHeader` prop to PageHeader component
  - Conditionally render Tabs only when `isMobile` is true
  - Create TabsList with 4 TabsTriggers: timeline, details, logs, artifacts
  - Use `grid grid-cols-4` for equal width tabs
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Lines: PageHeader component (lines 136-289)

- [ ] 2.4 [7/10] Replace content grid with conditional mobile/desktop rendering
  - Wrap content area in conditional based on `!isMobile`
  - Desktop branch: keep existing two-column grid (lines 294-319)
  - Mobile branch: create Tabs wrapper with 4 TabsContent sections
  - Each TabsContent: timeline (PhaseTimeline), details (DetailsTab), logs (LogsTab), artifacts (ArtifactsTab)
  - Apply proper overflow classes: `h-full mt-0 overflow-y-auto` for scrollable content
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Lines: 292-320

- [ ] 2.5 [8/10] Configure PhaseTimeline onSetActiveTab callback for mobile tab switching
  - In mobile TabsContent for timeline, modify `onSetActiveTab` prop
  - Call `setActiveTab(tab)` to maintain state
  - Map detail panel tabs to mobile tabs: details→details, logs→logs, artifacts→artifacts
  - Skip session tab (modal only, no tab switch)
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Lines: PhaseTimeline component in mobile branch

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: State Synchronization

**Phase Complexity**: 8 points (avg 4.0/10)

- [ ] 3.1 [5/10] Add useEffect to sync activeTab with mobileTab on mobile
  - Create useEffect with dependencies `[activeTab, isMobile]`
  - Check if `isMobile` is true
  - Map `activeTab` to `mobileTab`: details→details, logs→logs, artifacts→artifacts
  - Ignore session tab (modal only)
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Lines: After state declarations, before return statement

- [ ] 3.2 [3/10] Test state synchronization across viewport changes
  - Click timeline item that selects session/step
  - Verify mobile tab switches to appropriate detail tab
  - Resize window from mobile to desktop and back
  - Verify state persists and tab selection maintained
  - File: Manual testing in browser
  - Test at 767px and 768px breakpoints

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: Testing & Polish

**Phase Complexity**: 12 points (avg 4.0/10)

- [ ] 4.1 [5/10] Comprehensive mobile UI testing
  - Test title truncation with very long workflow run names
  - Verify status badge stays on same line as title
  - Test with multiple badges in afterTitle (webhook, issue link)
  - Verify tab content scrolls properly without layout shift
  - Test on actual mobile devices (iOS Safari, Android Chrome)
  - File: Manual testing across devices
  - Viewport sizes: 375px (iPhone SE), 390px (iPhone 12), 412px (Pixel 5)

- [ ] 4.2 [4/10] Test desktop layout unchanged
  - Verify two-column grid still renders on desktop
  - Check timeline header "Execution Timeline" visible
  - Verify WorkflowDetailPanel tabs function correctly
  - Test window resize from desktop to mobile and back
  - Ensure no layout breakage at 768px breakpoint
  - File: Manual testing in browser
  - Test at 767px, 768px, 769px, 1024px, 1440px

- [ ] 4.3 [3/10] Edge case and WebSocket testing
  - Test initial page load on mobile (defaults to timeline tab)
  - Verify deep link with selected session opens modal on mobile
  - Test WebSocket updates to run status, phase completion
  - Verify tab content updates in real-time when not active tab
  - Test landscape orientation on mobile devices
  - File: Manual testing with running workflows
  - Use workflow with multiple phases and real-time updates

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

No new unit tests required. Existing component tests cover tab components and hooks.

### Integration Tests

**Manual Integration Testing**:
- Mobile tab navigation switches content correctly
- Timeline item clicks trigger appropriate tab switches
- Detail panel state persists across mobile/desktop transitions
- WebSocket updates received in all tabs

### E2E Tests

**Future Consideration** (not in scope):
- E2E test for mobile workflow run page navigation
- Would use Playwright mobile viewport emulation
- Test tab switching and content visibility

## Success Criteria

- [ ] Desktop layout unchanged (two-column grid)
- [ ] Mobile shows 4 tabs: Timeline | Details | Logs | Artifacts
- [ ] Title truncates on mobile with ellipsis when too long
- [ ] Status badge remains on same line as title
- [ ] Clicking timeline item switches to correct mobile tab
- [ ] Session tab hidden on mobile (modal still works)
- [ ] Tab state persists when switching between tabs
- [ ] WebSocket updates work correctly on mobile
- [ ] Device rotation maintains current tab selection
- [ ] Window resize between mobile/desktop preserves state
- [ ] No layout shift or overflow issues on mobile
- [ ] All tab content scrollable independently

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/app && pnpm check-types
# Expected: No type errors

# Linting
cd apps/app && pnpm lint
# Expected: No lint errors

# Build verification
cd apps/app && pnpm build
# Expected: Successful build, no errors
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: workflow run detail page (any project, any workflow run)
3. Desktop (≥768px):
   - Verify two-column layout with timeline left, detail panel right
   - Verify "Execution Timeline" header visible on left
   - Verify detail panel tabs (Details, Session, Logs, Artifacts) work
4. Mobile (<768px):
   - Verify 4 tabs below header: Timeline | Details | Logs | Artifacts
   - Verify timeline tab shows PhaseTimeline component
   - Verify details tab shows run metadata
   - Verify logs tab shows step logs
   - Verify artifacts tab shows workflow artifacts
5. Title/Badge Layout:
   - Desktop: Verify status badge on same line as title
   - Mobile: Verify title truncates with ellipsis if too long
   - Mobile: Verify badge stays on same line, doesn't wrap
6. State Synchronization:
   - Click timeline item (session or step)
   - Mobile: Verify tab switches to appropriate detail view
   - Desktop: Verify detail panel updates as before
7. Viewport Changes:
   - Start mobile (<768px), switch tabs, resize to desktop (≥768px)
   - Verify selected detail tab maintained in desktop detail panel
   - Resize back to mobile, verify tab selection preserved

**Feature-Specific Checks:**

- Very long run name (>50 chars): Title truncates with ellipsis, no layout break
- Multiple badges (status + webhook + issue): All visible on same line as title
- Timeline item with session: Modal opens on mobile, doesn't switch to session tab
- WebSocket update (run status change): Update reflected immediately in all tabs
- Landscape orientation (mobile): Layout adapts correctly, tabs still accessible

## Implementation Notes

### 1. No Component Extraction Required

Individual tab components (DetailsTab, LogsTab, ArtifactsTab) are already modular and exported. WorkflowDetailPanel imports them on desktop, mobile imports them directly. No wrapper component needed.

### 2. Breakpoint Consistency

Use `useIsMobile` hook which checks `window.innerWidth < 768` to match Tailwind's `md:` breakpoint. Do not hardcode pixel values in JSX conditional rendering.

### 3. Tab Content Padding

DetailsTab and ArtifactsTab use `p-6` padding in TabsContent wrapper. LogsTab uses `p-0` because LogsTab component has internal padding. PhaseTimeline uses no padding, component handles its own spacing.

### 4. State Persistence

Mobile tab state (`mobileTab`) is component-local and resets on page load. Detail panel tab state (`activeTab`) persists via localStorage in `useWorkflowDetailPanel`. Mobile tab syncs with detail panel tab to maintain consistency.

## Dependencies

No new dependencies required.

## References

- Similar pattern: SpecPreviewPage uses Tabs for Preview/Edit mode switching
- Mobile hook: `apps/app/src/client/hooks/use-mobile.ts` (768px breakpoint)
- Existing components: `apps/app/src/client/components/ui/tabs.tsx` (Radix Tabs)
- Detail panel: `apps/app/src/client/pages/projects/workflows/components/detail-panel/WorkflowDetailPanel.tsx`

## Next Steps

1. Modify PageHeader component for title/badge layout (Phase 1)
2. Add mobile tab navigation to WorkflowRunDetailPage (Phase 2)
3. Implement state synchronization (Phase 3)
4. Comprehensive testing on mobile and desktop (Phase 4)
5. Verify no regressions in existing desktop workflow run page functionality
