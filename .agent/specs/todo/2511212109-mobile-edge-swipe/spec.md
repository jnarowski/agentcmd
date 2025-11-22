# Mobile Edge Swipe Sidebar

**Status**: draft
**Created**: 2025-11-21
**Package**: apps/app (Frontend)
**Total Complexity**: 35 points
**Phases**: 3
**Tasks**: 8
**Overall Avg Complexity**: 4.4/10

## Complexity Breakdown

| Phase                     | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Dependencies     | 1     | 2            | 2.0/10         | 2/10     |
| Phase 2: Implementation   | 5     | 25           | 5.0/10         | 6/10     |
| Phase 3: Testing & Polish | 2     | 8            | 4.0/10         | 5/10     |
| **Total**                 | **8** | **35**       | **4.4/10**     | **6/10** |

## Overview

Add left-to-right edge swipe gesture support to open the mobile sidebar. Users can swipe from the left 40px edge zone to reveal the sidebar, providing a native mobile app experience without relying solely on the hamburger menu button.

## User Story

As a mobile user
I want to swipe from the left edge of the screen
So that I can quickly access the sidebar navigation without tapping a button

## Technical Approach

Use `@use-gesture/react` library for cross-browser gesture recognition combined with custom edge detection logic. The library handles velocity calculation, multi-touch filtering, and pointer event normalization, while we implement edge zone detection (< 40px from left edge) to avoid conflicts with iOS/Android native back gestures.

## Key Design Decisions

1. **40px edge zone**: Starts gesture detection at 40px from left edge to avoid conflict with iOS (0-30px) and Android native back navigation gestures
2. **100px or 0.5 velocity threshold**: Trigger sidebar open on either 100px swipe distance OR 0.5 velocity for responsive feel without accidental triggers
3. **@use-gesture/react library**: Handles cross-browser compatibility, velocity calculation, and touch event normalization (37.2 kB bundle cost worth saving 2-3 dev days)
4. **Invisible edge zone component**: Fixed-position div that only renders on mobile when sidebar closed, using `touch-action: pan-y` CSS to allow vertical scroll while capturing horizontal swipe

## Architecture

### File Structure

```
apps/app/src/client/
├── hooks/
│   └── use-edge-swipe.ts          # Custom hook wrapping @use-gesture/react
├── components/
│   └── EdgeSwipeZone.tsx          # Invisible edge detection component
└── layouts/
    └── AppLayout.tsx              # Integration point
```

### Integration Points

**Sidebar System**:

- `apps/app/src/client/components/ui/sidebar.tsx` - Uses `openMobile` state from context
- `apps/app/src/client/layouts/AppLayout.tsx` - Renders EdgeSwipeZone, provides `setOpenMobile` callback

**Mobile Detection**:

- `apps/app/src/client/hooks/use-mobile.ts` - Already exists, 768px breakpoint

## Implementation Details

### 1. Edge Swipe Hook

Custom React hook that wraps `@use-gesture/react`'s `useDrag` with edge detection logic.

**Key Points**:

- Accepts `onSwipe` callback to trigger when gesture threshold met
- Configurable edge width (default 40px), threshold (default 100px), velocity (default 0.5)
- Only active on mobile via `useIsMobile()` check
- Returns gesture bind handlers to attach to edge zone component

**Hook API**:

```typescript
useEdgeSwipe({
  onSwipe: () => setOpenMobile(true),
  edgeWidth: 40,
  threshold: 100,
  velocity: 0.5,
});
```

### 2. Edge Swipe Zone Component

Invisible fixed-position div that captures touch gestures from left edge.

**Key Points**:

- Renders only when `isMobile && !openMobile`
- Fixed position: left 0, top 0, 40px width, 100vh height
- CSS `touch-action: pan-y` allows vertical scroll while capturing horizontal swipe
- Z-index above content (z-40) but below sidebar overlay (z-50)
- Binds gesture handlers from `useEdgeSwipe` hook

### 3. AppLayout Integration

Add EdgeSwipeZone component alongside existing sidebar.

**Key Points**:

- Place inside `<SidebarProvider>` to access sidebar context
- Pass `setOpenMobile` from `useSidebar()` hook
- Conditional render based on `isMobile && !openMobile`
- No changes to existing sidebar behavior

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/client/hooks/use-edge-swipe.ts` - Custom hook wrapping @use-gesture/react with edge detection
2. `apps/app/src/client/components/EdgeSwipeZone.tsx` - Invisible edge zone component

### Modified Files (2)

1. `apps/app/package.json` - Add `@use-gesture/react` dependency
2. `apps/app/src/client/layouts/AppLayout.tsx` - Integrate EdgeSwipeZone component

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Dependencies

**Phase Complexity**: 2 points (avg 2.0/10)

- [ ] 1.1 [2/10] Install @use-gesture/react dependency
  - Run: `pnpm add @use-gesture/react`
  - File: `apps/app/package.json`
  - Verify: Check package.json shows `"@use-gesture/react": "^10.3.1"` or latest

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Implementation

**Phase Complexity**: 25 points (avg 5.0/10)

- [ ] 2.1 [4/10] Create edge swipe hook
  - Create new file: `apps/app/src/client/hooks/use-edge-swipe.ts`
  - Import `useDrag` from `@use-gesture/react`
  - Import `useIsMobile` from `@/client/hooks/use-mobile`
  - Implement hook with edge detection logic: check if `initial[0]` (X position) < edgeWidth
  - Trigger callback if `movement[0]` (horizontal delta) > threshold OR `velocity[0]` > velocity threshold
  - Configure `useDrag` with `axis: 'x'`, `filterTaps: true`, `pointer: { touch: true }`
  - Return bind handlers for attaching to component
  - Only activate gesture detection when `isMobile` is true

- [ ] 2.2 [5/10] Create EdgeSwipeZone component
  - Create new file: `apps/app/src/client/components/EdgeSwipeZone.tsx`
  - Import `useEdgeSwipe` hook
  - Import `useSidebar` from `@/client/components/ui/sidebar`
  - Import `useIsMobile` from `@/client/hooks/use-mobile`
  - Render fixed-position div: `position: fixed; left: 0; top: 0; width: 40px; height: 100vh`
  - Apply CSS: `touch-action: pan-y` (allow vertical scroll, capture horizontal)
  - Z-index: 40 (above content, below sidebar overlay at 50)
  - Conditional render: Only show when `isMobile && !openMobile`
  - Bind gesture handlers from `useEdgeSwipe` to div
  - Pass `setOpenMobile(true)` as onSwipe callback

- [ ] 2.3 [6/10] Integrate EdgeSwipeZone in AppLayout
  - File: `apps/app/src/client/layouts/AppLayout.tsx`
  - Import `EdgeSwipeZone` component
  - Add `<EdgeSwipeZone />` inside `<SidebarProvider>` after `<AppSidebar />`
  - EdgeSwipeZone automatically accesses `setOpenMobile` via `useSidebar()` context
  - No props needed - component handles everything internally
  - Verify conditional rendering works (only shows on mobile when sidebar closed)

- [ ] 2.4 [5/10] Add TypeScript types and exports
  - File: `apps/app/src/client/hooks/use-edge-swipe.ts`
  - Define `UseEdgeSwipeOptions` interface with optional config properties
  - Export hook with proper JSDoc comments
  - File: `apps/app/src/client/components/EdgeSwipeZone.tsx`
  - Add proper React component typing
  - Export component as default

- [ ] 2.5 [5/10] Verify cross-browser compatibility
  - Test that `touch-action: pan-y` CSS is applied correctly
  - Verify z-index layering (edge zone visible/clickable when sidebar closed, hidden when open)
  - Check that gesture only activates from left edge (< 40px from left)
  - Verify vertical scrolling still works normally on mobile

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Testing & Polish

**Phase Complexity**: 8 points (avg 4.0/10)

- [ ] 3.1 [5/10] Manual device testing
  - Test on iOS Safari (iPhone) - verify no conflict with back gesture
  - Test on Android Chrome - verify swipe activates correctly
  - Test swipe from middle of screen does nothing
  - Test swipe from left edge (< 40px) opens sidebar
  - Test fast swipe (velocity threshold) opens sidebar
  - Test slow drag past 100px opens sidebar
  - Test vertical scroll while touching edge zone still works
  - Test sidebar already open - edge zone should be hidden

- [ ] 3.2 [3/10] Code cleanup and documentation
  - Add JSDoc comments to hook explaining edge detection logic
  - Add JSDoc to component explaining when it renders
  - Verify no console errors or warnings
  - Run type check: `pnpm check-types`
  - Run lint: `pnpm lint`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Manual Testing (Primary)

**Physical Device Required** - Chrome DevTools touch emulation doesn't perfectly simulate edge gestures.

**Test Devices**:

- iOS Safari (iPhone/iPad) - Critical
- Android Chrome - Critical
- Desktop Chrome touch mode - Nice to have

**Test Scenarios**:

1. Swipe from left edge (< 40px) opens sidebar
2. Swipe from middle/right of screen does nothing
3. Fast swipe (high velocity) triggers open
4. Slow drag past 100px triggers open
5. Vertical scrolling works normally
6. No conflict with iOS back gesture
7. Edge zone hidden when sidebar already open
8. Edge zone not rendered on desktop (> 768px width)

### Automated Testing

No unit/integration tests required for this feature - gesture behavior must be validated on physical devices.

## Success Criteria

- [ ] Swipe from left 40px edge zone opens mobile sidebar
- [ ] Swipe from middle of screen does nothing
- [ ] 100px horizontal movement triggers open
- [ ] 0.5 velocity swipe triggers open
- [ ] No conflict with iOS/Android native back gesture (starts at 40px not 0px)
- [ ] Vertical scrolling still works normally on mobile
- [ ] Edge zone only rendered on mobile (< 768px) when sidebar closed
- [ ] No console errors or TypeScript errors
- [ ] Code passes lint and type checks

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

# Build verification (from apps/app/)
pnpm build
# Expected: Successful build, no errors
```

**Manual Verification:**

1. Start application: `pnpm dev` (from apps/app/)
2. Open on mobile device or Chrome DevTools device mode: `http://localhost:5173`
3. Verify on desktop (> 768px width): Edge zone should NOT be rendered
4. Switch to mobile view (< 768px width):
   - Close sidebar if open
   - Verify edge zone rendered (invisible but present - check with DevTools)
   - Swipe from left edge (< 40px from left) - sidebar should open
   - Swipe from middle of screen - nothing should happen
   - Try fast swipe from edge - should open
   - Try slow drag from edge past 100px - should open
5. Verify vertical scrolling: Touch left edge and scroll vertically - should scroll normally, not open sidebar
6. Open sidebar, verify edge zone hidden (check DevTools - should not render)

**Feature-Specific Checks:**

- **iOS Safari**: Swipe from 40px edge should NOT trigger native back navigation
- **Android Chrome**: Swipe should work smoothly without lag
- **Edge detection**: Measure touch start position in DevTools - should only trigger if < 40px from left
- **Z-index**: Edge zone should be clickable/swipeable when sidebar closed, not interfere when open

## Implementation Notes

### 1. iOS Back Gesture Conflict

iOS Safari native back gesture activates from 0-30px from left edge. Our 40px threshold avoids this conflict zone. Users may still accidentally trigger back gesture if they swipe from the very edge (< 30px), but this is acceptable tradeoff for reliable edge swipe detection.

### 2. Touch-Action CSS Property

The `touch-action: pan-y` CSS property is critical for allowing vertical scroll while capturing horizontal swipe. Without this, vertical scrolling would be blocked when touching the edge zone.

### 3. Passive Event Listeners

The `@use-gesture/react` library handles passive event listener optimization automatically for scroll performance. No manual configuration needed.

### 4. Bundle Size Impact

Adding `@use-gesture/react` increases bundle size by 37.2 kB. This is acceptable given the 2-3 days of dev time saved implementing cross-browser gesture detection from scratch.

## Dependencies

- `@use-gesture/react@^10.3.1` - New dependency for gesture recognition

## References

- @use-gesture/react docs: https://use-gesture.netlify.app/
- MDN touch-action CSS: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- iOS Safari gesture zones: https://webkit.org/blog/5610/more-responsive-tapping-on-ios/

## Next Steps

1. Install @use-gesture/react dependency
2. Create useEdgeSwipe hook with edge detection logic
3. Create EdgeSwipeZone component with 40px fixed-position zone
4. Integrate EdgeSwipeZone in AppLayout
5. Test on physical iOS and Android devices
6. Adjust threshold values if needed based on user feedback
