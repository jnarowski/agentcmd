# Workflow Logs Tab Merge Conflict Resolution

**Status**: draft
**Created**: 2025-11-16
**Package**: apps/app
**Total Complexity**: 8 points
**Phases**: 2
**Tasks**: 4
**Overall Avg Complexity**: 2.0/10

## Complexity Breakdown

| Phase                    | Tasks   | Total Points | Avg Complexity | Max Task   |
| ------------------------ | ------- | ------------ | -------------- | ---------- |
| Phase 1: Resolve Conflict| 2       | 5            | 2.5/10         | 3/10       |
| Phase 2: Clean Up UI     | 2       | 3            | 1.5/10         | 2/10       |
| **Total**                | **4**   | **8**        | **2.0/10**     | **3/10**   |

## Overview

Resolve merge conflict in useWorkflowDetailPanel.ts between "log" and "logs" tab naming, remove duplicate tab from WorkflowDetailPanel, and ensure consistent tab naming across the workflow detail UI.

## User Story

As a developer merging the workflow logging feature
I want to resolve the tab naming conflict and remove duplicates
So that the workflow detail panel displays correctly without duplicate tabs

## Technical Approach

Resolve git merge conflict by choosing "logs" (matches completed spec), remove duplicate "log" tab trigger from WorkflowDetailPanel.tsx, verify no other references to "log" tab exist in codebase.

## Key Design Decisions

1. **Use "logs" not "log"**: Completed spec 251115143849 uses "logs" throughout - maintain consistency
2. **Single source of truth**: WorkflowTab type in useWorkflowDetailPanel.ts defines valid tabs
3. **Remove duplicate tab**: WorkflowDetailPanel has both "logs" (line 27) and "log" (line 29) - keep "logs", remove "log"

## Architecture

### File Structure
```
apps/app/src/client/pages/projects/workflows/
├── hooks/
│   └── useWorkflowDetailPanel.ts          # CONFLICT: "log" vs "logs" in WorkflowTab type
└── components/detail-panel/
    └── WorkflowDetailPanel.tsx             # DUPLICATE: Both "logs" and "log" tabs defined
```

### Integration Points

**Frontend**:
- `useWorkflowDetailPanel.ts` - Defines WorkflowTab type and manages active tab state
- `WorkflowDetailPanel.tsx` - Renders tab UI with TabsList and TabsContent

## Implementation Details

### 1. Merge Conflict Resolution

The conflict is in the WorkflowTab type union:

**Current state (conflicted):**
- Ours (stage 2): `export type WorkflowTab = "details" | "session" | "logs" | "artifacts";`
- Theirs (stage 3): `export type WorkflowTab = "details" | "session" | "artifacts" | "log";`

**Resolution:** Use "logs" to match completed spec 251115143849-workflow-logging

**Key Points**:
- Completed spec consistently uses "logs" throughout
- LogsTab component exists and implements full logging UI
- "log" tab in WorkflowDetailPanel has placeholder content only

### 2. Duplicate Tab Removal

WorkflowDetailPanel.tsx currently has:
```tsx
<TabsTrigger value="logs">Logs</TabsTrigger>
<TabsTrigger value="log">Log</TabsTrigger>
```

And corresponding content:
```tsx
<TabsContent value="logs" ...>
  <LogsTab run={run} />
</TabsContent>

<TabsContent value="log" ...>
  <div>Log content goes here</div>
</TabsContent>
```

**Key Points**:
- Remove TabsTrigger with value="log"
- Remove TabsContent with value="log"
- Keep TabsTrigger and TabsContent with value="logs" (has full LogsTab implementation)

## Files to Create/Modify

### New Files (0)

None

### Modified Files (2)

1. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDetailPanel.ts` - Resolve merge conflict, use "logs"
2. `apps/app/src/client/pages/projects/workflows/components/detail-panel/WorkflowDetailPanel.tsx` - Remove duplicate "log" tab

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Resolve Merge Conflict

**Phase Complexity**: 5 points (avg 2.5/10)

- [ ] 1.1 [3/10] Resolve merge conflict in useWorkflowDetailPanel.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDetailPanel.ts`
  - Accept "ours" version (stage 2): `WorkflowTab = "details" | "session" | "logs" | "artifacts"`
  - Command: `git checkout --ours apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDetailPanel.ts`
  - Mark resolved: `git add apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDetailPanel.ts`
  - Verify: `git status` shows no unmerged paths

- [ ] 1.2 [2/10] Verify no other files reference "log" tab
  - Search for "log" tab references: `grep -r '"log"' apps/app/src/client/pages/projects/workflows/`
  - Expected: Find WorkflowDetailPanel.tsx duplicate only
  - Check imports: `grep -r 'WorkflowTab' apps/app/src/client/pages/projects/workflows/`
  - Expected: Only useWorkflowDetailPanel.ts exports, other files import

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Clean Up Duplicate Tab

**Phase Complexity**: 3 points (avg 1.5/10)

- [ ] 2.1 [2/10] Remove duplicate "log" tab trigger from WorkflowDetailPanel
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/WorkflowDetailPanel.tsx`
  - Remove line 29: `<TabsTrigger value="log">Log</TabsTrigger>`
  - Keep line 27: `<TabsTrigger value="logs">Logs</TabsTrigger>`
  - Verify tab order: details, session, logs, artifacts

- [ ] 2.2 [1/10] Remove duplicate "log" tab content from WorkflowDetailPanel
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/WorkflowDetailPanel.tsx`
  - Remove lines 53-56: TabsContent with value="log" and placeholder div
  - Keep lines 45-47: TabsContent with value="logs" and LogsTab component
  - Verify type-check passes: `pnpm --filter app check-types`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new tests needed - existing tests cover tab functionality

### Integration Tests

No integration tests needed - simple UI cleanup

### E2E Tests

Manual verification sufficient for this fix

## Success Criteria

- [ ] Merge conflict resolved in useWorkflowDetailPanel.ts
- [ ] WorkflowTab type uses "logs" not "log"
- [ ] WorkflowDetailPanel has single "Logs" tab (not duplicate)
- [ ] LogsTab component renders in "logs" tab
- [ ] No placeholder "log" tab exists
- [ ] TypeScript compilation succeeds
- [ ] Git status shows no unmerged paths

## Validation

Execute these commands to verify the fix works correctly:

**Automated Verification:**

```bash
# Check merge conflict resolved
git status
# Expected: No unmerged paths listed

# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Build verification
pnpm --filter app build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/workflows`
3. Open any workflow run detail page
4. Verify: Only 4 tabs visible: Details, Session, Logs, Artifacts
5. Click "Logs" tab
6. Verify: LogsTab component renders with step logs (not placeholder)
7. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify localStorage persists "logs" tab selection correctly
- Verify switching between tabs works smoothly
- Verify no duplicate tab labels in UI
- Verify tab content matches selected tab

## Implementation Notes

### 1. Why "logs" Not "log"

Completed spec 251115143849 consistently uses "logs":
- Tab value: "logs"
- Component name: LogsTab
- All documentation refers to "Logs" tab

Using "logs" maintains consistency with completed implementation.

### 2. Safe Conflict Resolution

The merge conflict is purely cosmetic (singular vs plural). Both versions have identical functionality - just different naming. Safe to choose either, but "logs" matches existing implementation.

### 3. No Database Changes

This is purely frontend naming - no backend or database changes needed.

## Dependencies

- No new dependencies required

## References

- `.agent/specs/todo/251115143849-workflow-logging/spec.md` - Completed logging spec using "logs"
- `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx` - Logs tab implementation
- Git documentation: https://git-scm.com/docs/git-checkout#Documentation/git-checkout.txt---ours

## Next Steps

1. Resolve merge conflict using "logs"
2. Remove duplicate "log" tab from UI
3. Verify build and type-check pass
4. Test UI manually
5. Commit resolved changes
6. Continue with other workflow features
