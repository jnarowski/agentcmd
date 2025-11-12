# Workflow Item Sidebar Alignment

**Status**: in-progress
**Created**: 2025-11-12
**Package**: apps/app
**Total Complexity**: 13 points
**Phases**: 2
**Tasks**: 4
**Overall Avg Complexity**: 3.3/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Add Status Icon | 2 | 8 | 4.0/10 | 5/10 |
| Phase 2: Layout Alignment | 2 | 5 | 2.5/10 | 3/10 |
| **Total** | **4** | **13** | **3.3/10** | **5/10** |

## Overview

Align WorkflowItem sidebar component layout with SessionItem to create visual consistency in the Activities sidebar. Both components are displayed in the same list and should have matching visual structure with status icons, truncation, hover states, and active state support.

## User Story

As a user
I want workflow runs and sessions to have consistent visual styling in the sidebar
So that the Activities list feels cohesive and I can quickly identify status at a glance

## Technical Approach

Update `WorkflowItem.tsx` to match `SessionItem.tsx` structure by:
1. Adding status icon using existing `workflowStatus.ts` configuration
2. Adding truncation, hover states, and isActive prop support
3. Maintaining navigation-only behavior (no dropdown menu)

## Key Design Decisions

1. **Status Icons from workflowStatus.ts**: Use centralized status config for consistency with WorkflowRunDetails
2. **Icon Position**: Place status icon before workflow name (matching SessionItem's AgentIcon position)
3. **No Hover Menu**: Keep simple click-to-navigate behavior (user requirement)

## Architecture

### File Structure

```
apps/app/src/client/
├── components/sidebar/
│   ├── WorkflowItem.tsx          # MODIFY - Add icon, truncation, states
│   └── SessionItem.tsx            # REFERENCE - Target layout
└── pages/projects/workflows/
    └── utils/
        └── workflowStatus.ts      # USE - Status config with icons
```

### Integration Points

**WorkflowItem.tsx**:
- Import `getWorkflowStatusConfig` from `workflowStatus.ts`
- Add icon rendering with status-specific styling and animations
- Add hover state tracking with `useState`
- Add `isActive` prop support for active highlighting

## Implementation Details

### 1. Status Icon Integration

Add status icon from `workflowStatus.ts` before workflow name:
- Clock icon for pending
- Play icon for running (with blue color)
- CheckCircle2 for completed (green)
- XCircle for failed (red)
- Pause for paused
- Ban for cancelled

**Key Points**:
- Use `getWorkflowStatusConfig(status)` to get icon and colors
- Apply spin animation for "running" status
- Size: `size-4`, `shrink-0`, `mr-1` (matching SessionItem)
- Position: Before workflow name, after button padding

### 2. Layout Enhancements

Add missing layout features to match SessionItem:
- Add `truncate` class to workflow name span
- Add `isActive` prop to component interface
- Pass `isActive` to `SidebarMenuButton`
- Add hover state tracking with `useState`

**Key Points**:
- Keep existing navigation behavior
- No dropdown menu (user requirement)
- Maintain all existing styling for badges and container

## Files to Create/Modify

### New Files (0)

None - all changes are modifications to existing file

### Modified Files (1)

1. `apps/app/src/client/components/sidebar/WorkflowItem.tsx` - Add status icon, truncation, hover and active states

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Add Status Icon

**Phase Complexity**: 8 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] 1.1 5/10 Import status config and icon components
  - Add import for `getWorkflowStatusConfig` from `@/client/pages/projects/workflows/utils/workflowStatus`
  - Add import for `type { WorkflowStatus }` from `@/shared/schemas/workflow.schemas`
  - File: `apps/app/src/client/components/sidebar/WorkflowItem.tsx`
  - Update WorkflowItemProps status type from `string` to `WorkflowStatus`
- [x] 1.2 3/10 Render status icon before workflow name
  - Get status config using `getWorkflowStatusConfig(status)`
  - Destructure icon component from config
  - Render icon with classes: `size-4 shrink-0 mr-1`
  - Add conditional spin animation for "running" status: `${status === "running" ? "animate-spin" : ""}`
  - Apply text color from status config
  - File: `apps/app/src/client/components/sidebar/WorkflowItem.tsx`

#### Completion Notes

- Added status icon from workflowStatus.ts config before workflow name
- Icon uses correct size-4, shrink-0, mr-1 classes matching SessionItem layout
- Running status shows spinning animation
- Text colors from status config applied (blue/green/red/gray)
- All Phase 1 and Phase 2 tasks completed in single implementation

### Phase 2: Layout Alignment

**Phase Complexity**: 5 points (avg 2.5/10)

<!-- prettier-ignore -->
- [x] 2.1 3/10 Add truncation and active state support
  - Add `isActive?: boolean` to WorkflowItemProps interface (default false)
  - Add `truncate` class to workflow name span (line 49)
  - Pass `isActive` prop to SidebarMenuButton
  - File: `apps/app/src/client/components/sidebar/WorkflowItem.tsx`
- [x] 2.2 2/10 Add hover state tracking
  - Import `useState` from "react"
  - Add hover state: `const [isHovered, setIsHovered] = useState(false)`
  - Add `onMouseEnter` and `onMouseLeave` handlers to SidebarMenuItem
  - File: `apps/app/src/client/components/sidebar/WorkflowItem.tsx`

#### Completion Notes

- Added isActive prop support with default false
- Added truncate class to workflow name span for proper text overflow
- Added hover state tracking with useState
- Added mouse enter/leave handlers to SidebarMenuItem
- Component now matches SessionItem visual structure and behavior

## Testing Strategy

### Unit Tests

Not applicable - component styling changes only

### Integration Tests

**Manual verification** - Visual consistency with SessionItem

### E2E Tests

Not required - UI styling update only

## Success Criteria

- [ ] WorkflowItem displays status icon before name
- [ ] Icon animates (spins) when status is "running"
- [ ] Icon colors match workflow status (blue=running, green=completed, red=failed, etc.)
- [ ] Workflow name truncates when too long
- [ ] Active workflow is highlighted in sidebar
- [ ] Hover state is tracked (for potential future use)
- [ ] Visual layout matches SessionItem structure
- [ ] No TypeScript errors
- [ ] Build succeeds

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/app && pnpm check-types
# Expected: No type errors

# Build verification
cd apps/app && pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Sidebar "Activities" tab
3. Verify: Workflow items show status icons before name
4. Test: Click workflow item - navigates to workflow detail
5. Check: Active workflow is highlighted
6. Check: Long workflow names are truncated with ellipsis
7. Check: Running workflows show spinning icon
8. Verify: Icons match status colors (blue/green/red)
9. Compare: Visual layout matches session items in same list

**Feature-Specific Checks:**

- Status icons use correct lucide-react components (Clock, Play, CheckCircle2, XCircle, etc.)
- Icon sizing matches SessionItem AgentIcon (size-4)
- Icon spacing matches SessionItem (mr-1)
- No dropdown menu appears on hover (navigation only)
- Workflow name truncation prevents overflow

## Implementation Notes

### 1. Status Icon Component Pattern

The status icon should be rendered inline using the pattern from `workflowStatus.ts`:

```typescript
const statusConfig = getWorkflowStatusConfig(status);
const StatusIcon = statusConfig.icon;

<StatusIcon
  className={`size-4 shrink-0 mr-1 ${statusConfig.textColor} ${status === "running" ? "animate-spin" : ""}`}
/>
```

### 2. Preserve Existing Behavior

- Keep `getStatusColor()` function for badge styling
- Maintain existing navigation on click
- Do not add dropdown menu functionality
- Keep all existing badge structure unchanged

### 3. Alignment with SessionItem

Key similarities to achieve:
- Icon before name (size-4, shrink-0, mr-1)
- Name with truncate class
- isActive prop support
- Hover state tracking
- Same padding and layout structure

## Dependencies

- No new dependencies required
- Uses existing `workflowStatus.ts` configuration
- Uses existing lucide-react icons

## References

- `apps/app/src/client/components/sidebar/SessionItem.tsx` - Target layout reference
- `apps/app/src/client/pages/projects/workflows/utils/workflowStatus.ts` - Status configuration
- `apps/app/src/client/pages/projects/workflows/components/timeline/StepDefaultRow.tsx` - Status icon pattern

## Next Steps

1. Implement Phase 1: Add status icon with animations
2. Implement Phase 2: Add truncation, hover, and active states
3. Test visual consistency with SessionItem in Activities sidebar
4. Verify all manual validation steps pass
