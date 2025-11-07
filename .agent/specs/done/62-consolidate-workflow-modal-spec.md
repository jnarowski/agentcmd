# Consolidate Workflow Modal Components

**Status**: draft
**Created**: 2025-01-06
**Package**: apps/web
**Total Complexity**: 32 points
**Phases**: 3
**Tasks**: 8
**Overall Avg Complexity**: 4.0/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Enhance NewRunDialog | 3 | 18 | 6.0/10 | 7/10 |
| Phase 2: Update Parent Components | 3 | 10 | 3.3/10 | 5/10 |
| Phase 3: Cleanup | 2 | 4 | 2.0/10 | 2/10 |
| **Total** | **8** | **32** | **4.0/10** | **7/10** |

## Overview

Consolidate `NewWorkflowModal` and `NewRunDialog` into a single enhanced `NewRunDialog` component that supports optional workflow definition selection. When triggered from the workflows list, users select a definition via Combobox before configuring the run. When triggered from a definition detail view, the definition selector is hidden.

## User Story

As a developer
I want a unified workflow creation dialog
So that I have consistent UX whether creating from the list or detail view

## Technical Approach

Replace the 2-step wizard (`NewWorkflowModal`) with an enhanced `NewRunDialog` that conditionally shows a definition selection step. Use the same Combobox pattern for consistency with spec file and branch selection. All fields (spec, git mode) remain required in both flows.

## Key Design Decisions

1. **Single Component**: Use only `NewRunDialog`, delete `NewWorkflowModal` entirely
2. **Combobox for Definition**: Match UX pattern of spec/branch selection (searchable dropdown)
3. **Conditional Rendering**: Hide definition selector when `definitionId` prop is provided
4. **Required Fields**: Spec file and git mode required in both creation flows
5. **AI Name Generation**: Preserve existing behavior from spec file

## Architecture

### File Structure

```
apps/web/src/client/pages/projects/workflows/
├── components/
│   ├── NewRunDialog.tsx              # Enhanced (modified)
│   ├── NewWorkflowModal.tsx          # Deleted
│   ├── NewRunFormDialogArgSchemaFields.tsx  # No changes
│   └── WorkflowDefinitionView.tsx    # No changes needed
├── ProjectWorkflowsView.tsx          # Modified to use NewRunDialog
└── hooks/
    ├── useWorkflowDefinitions.tsx    # Already exists
    └── useWorkflowMutations.tsx      # Already exists
```

### Integration Points

**NewRunDialog**:
- Accepts optional `definitions?: WorkflowDefinition[]` prop
- Accepts `definitionId: string` prop (empty string triggers selector)
- Resets spec/name/args state when definition changes
- Uses existing `useCreateWorkflow` mutation

**ProjectWorkflowsView**:
- Replaces `isModalOpen` state with `showNewRunDialog`
- Passes `definitions` array from `useWorkflowDefinitions()`
- Passes empty `definitionId=""` to trigger definition selection

## Implementation Details

### 1. NewRunDialog Enhancement

Add workflow definition selection as first field (conditionally rendered).

**Key Points**:
- Add `definitions?: WorkflowDefinition[]` prop
- Change `definitionId` prop from required to optional (empty string = show selector)
- Add `selectedDefinitionId` state (managed internally)
- Reset dependent state when definition changes
- Derive `definition` from `selectedDefinitionId` or prop
- Show definition selector only when `!definitionId && definitions?.length`

### 2. ProjectWorkflowsView Refactor

Replace `NewWorkflowModal` with `NewRunDialog`.

**Key Points**:
- Remove `isModalOpen` state, use `showNewRunDialog` instead
- Pass `definitions` array from `useWorkflowDefinitions()`
- Pass `definitionId=""` to trigger selector
- Remove `handleCreateWorkflow` wrapper (dialog handles mutation internally)
- Update button handlers

### 3. Definition Combobox Options

Transform definitions to Combobox format.

**Key Points**:
- Add `useMemo` to create options: `{ value: id, label: name, description }`
- Support search by name
- Show description in dropdown

## Files to Create/Modify

### New Files (0)

None - all changes to existing files

### Modified Files (2)

1. `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx` - Add definition selector, manage selected definition state
2. `apps/web/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx` - Replace NewWorkflowModal with NewRunDialog

### Deleted Files (1)

1. `apps/web/src/client/pages/projects/workflows/components/NewWorkflowModal.tsx` - No longer needed

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Enhance NewRunDialog

**Phase Complexity**: 18 points (avg 6.0/10)

<!-- prettier-ignore -->
- [x] 1.1 [7/10] Add optional definition selection props and state to NewRunDialog
  - Add `definitions?: WorkflowDefinition[]` prop
  - Change `definitionId` prop to allow empty string
  - Add `selectedDefinitionId` state initialized from prop or empty string
  - Add effect to reset spec/name/args when `selectedDefinitionId` changes
  - Derive actual definition from `selectedDefinitionId || definitionId`
  - File: `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx`

- [x] 1.2 [6/10] Add definition Combobox field as first form element
  - Add `useMemo` to transform definitions to Combobox options
  - Add definition Combobox before spec file field
  - Show only when `!definitionId && definitions && definitions.length > 0`
  - Use same styling as spec/branch Combobox
  - Update dialog description based on selected definition
  - File: `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx`

- [x] 1.3 [5/10] Update validation to handle empty definition selection
  - Add validation: "Workflow definition is required"
  - Disable "Create Execution" button when no definition selected
  - Update error handling for missing definition
  - File: `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx`

#### Completion Notes

- Added `definitions` prop to NewRunDialog interface
- Implemented `selectedDefinitionId` state initialized from `definitionId` prop
- Added `actualDefinition` derived value that prioritizes prop over selected state
- Created reset effect when definition changes (clears spec/name/args)
- Added Combobox for definition selection with search support
- Definition selector only shows when `!definitionId && definitions?.length > 0`
- Implemented validation preventing creation without definition when selector is shown
- Button disabled state reflects validation rules
- All mutations and navigation use `selectedDefinitionId || definitionId`

### Phase 2: Update Parent Components

**Phase Complexity**: 10 points (avg 3.3/10)

<!-- prettier-ignore -->
- [x] 2.1 [5/10] Refactor ProjectWorkflowsView to use NewRunDialog
  - Remove import of `NewWorkflowModal`
  - Import `NewRunDialog` instead
  - Replace `isModalOpen` state with `showNewRunDialog`
  - Remove `handleCreateWorkflow` function (dialog handles mutation)
  - Pass `definitions` prop to NewRunDialog
  - Pass `definitionId=""` to trigger selector
  - Update button handler: `onClick={() => setShowNewRunDialog(true)}`
  - File: `apps/web/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx`

- [x] 2.2 [3/10] Verify WorkflowDefinitionView still works correctly
  - Confirm it passes `definitionId` prop (not empty string)
  - Confirm definition selector is hidden
  - Test "New Run" button opens dialog without selector
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx` (read-only verification)

- [x] 2.3 [2/10] Update button text for consistency
  - Change "New Workflow" button to "New Run" in ProjectWorkflowsView
  - Ensure consistent terminology across both views
  - File: `apps/web/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx`

#### Completion Notes

- Replaced `NewWorkflowModal` import with `NewRunDialog` in ProjectWorkflowsView
- Changed state from `isModalOpen` to `showNewRunDialog`
- Removed `handleCreateWorkflow` function (dialog handles mutation internally now)
- Removed `useCreateWorkflow` import (no longer needed in parent)
- Updated button text from "New Workflow" to "New Run"
- Pass empty string as `definitionId=""` to trigger definition selector
- Pass `definitions` prop to enable definition selection
- WorkflowDefinitionView verified - passes non-empty `definitionId` which correctly hides selector
- Both views now use consistent "New Run" terminology

### Phase 3: Cleanup

**Phase Complexity**: 4 points (avg 2.0/10)

<!-- prettier-ignore -->
- [x] 3.1 [2/10] Delete NewWorkflowModal component
  - Remove file: `apps/web/src/client/pages/projects/workflows/components/NewWorkflowModal.tsx`
  - Verify no other imports exist via grep
  - Command: `git rm apps/web/src/client/pages/projects/workflows/components/NewWorkflowModal.tsx`

- [x] 3.2 [2/10] Search for any remaining references to NewWorkflowModal
  - Search codebase for "NewWorkflowModal" string
  - Remove any stale imports or comments
  - Command: `rg "NewWorkflowModal" apps/web/src/`

#### Completion Notes

- Deleted `NewWorkflowModal.tsx` using `git rm`
- Searched entire `apps/web/src/` directory for "NewWorkflowModal" references
- No remaining references found - clean removal

## Testing Strategy

### Unit Tests

No new unit tests required - existing component behavior preserved.

### Manual Testing

**Test both creation flows work correctly**

## Success Criteria

- [ ] NewRunDialog shows definition selector when `definitions` prop provided and `definitionId` empty
- [ ] NewRunDialog hides definition selector when `definitionId` prop is non-empty
- [ ] Selecting a definition resets spec file, name, and args
- [ ] Spec file, git mode, branch settings all required in both flows
- [ ] AI name generation from spec file works in both flows
- [ ] Creating run from workflows list navigates to run detail page
- [ ] Creating run from definition view navigates to run detail page
- [ ] NewWorkflowModal.tsx deleted and no imports remain
- [ ] All TypeScript compilation passes
- [ ] No lint errors

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

# Build verification
pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/workflows`
3. Click "New Run" button
4. Verify: Definition selector Combobox appears as first field
5. Select a workflow definition
6. Verify: Spec file field appears, name field appears
7. Select spec file
8. Verify: AI generates run name and branch name
9. Configure git mode and submit
10. Verify: Navigates to run detail page
11. Navigate back to workflows list
12. Click on a workflow definition card
13. Click "New Run" button
14. Verify: Definition selector is hidden, form starts with spec file
15. Complete form and submit
16. Verify: Navigates to run detail page

**Feature-Specific Checks:**

- Definition Combobox is searchable
- Changing definition resets form fields
- Required field validation works
- Dialog closes on successful creation
- Both creation flows produce identical workflow runs

## Implementation Notes

### 1. State Management

When definition changes, reset dependent state to avoid stale data:

```typescript
useEffect(() => {
  if (selectedDefinitionId) {
    setSpecFile("");
    setName("");
    setArgs({});
  }
}, [selectedDefinitionId]);
```

### 2. Conditional Rendering

Show definition selector only when needed:

```typescript
{!definitionId && definitions && definitions.length > 0 && (
  <div>
    <Label>Workflow Definition</Label>
    <Combobox {...definitionComboboxProps} />
  </div>
)}
```

### 3. TypeScript Props

Make `definitionId` accept empty string:

```typescript
interface NewRunDialogProps {
  definitionId: string;  // Can be empty string
  definitions?: WorkflowDefinition[];
  // ... other props
}
```

## Dependencies

No new dependencies required

## References

- NewRunDialog current implementation: `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx`
- NewWorkflowModal to delete: `apps/web/src/client/pages/projects/workflows/components/NewWorkflowModal.tsx`
- Combobox component: `apps/web/src/client/components/ui/combobox.tsx`

## Next Steps

1. Begin Phase 1: Enhance NewRunDialog with definition selection
2. Test definition selector functionality
3. Update ProjectWorkflowsView to use enhanced dialog
4. Verify both creation flows work end-to-end
5. Delete NewWorkflowModal and verify no broken imports
6. Run validation commands and manual testing
