# Webhook Event System Revamp

**Status**: draft
**Created**: 2025-11-20
**Package**: apps/app
**Total Complexity**: 142 points
**Phases**: 4
**Tasks**: 26
**Overall Avg Complexity**: 5.5/10

## Complexity Breakdown

| Phase                                  | Tasks | Total Points | Avg Complexity | Max Task |
| -------------------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Backend - Data & Types       | 6     | 26           | 4.3/10         | 6/10     |
| Phase 2: Backend - Services           | 7     | 45           | 6.4/10         | 8/10     |
| Phase 3: Frontend - Components & UI   | 10    | 58           | 5.8/10         | 8/10     |
| Phase 4: Testing & Validation          | 3     | 13           | 4.3/10         | 5/10     |
| **Total**                              | **26** | **142**     | **5.5/10**     | **8/10** |

## Overview

Simplify webhook configuration by removing webhook-level conditions and unifying field mappings into a single array structure. Focus on three key fields (Spec Content, Spec Type, Workflow Definition) with conditional or simple mapping modes, improving UX with visual precedence indicators and test payload preview.

## User Story

As a developer configuring webhooks
I want a simpler, more intuitive mapping system with visual feedback
So that I can quickly set up conditional routing rules and test them against real payloads

## Technical Approach

Replace the dual-mode field mapping system (generic field_mappings + webhook_conditions) with a unified mappings array where empty conditions indicate simple mode. Extract mapping fields into reusable constants for easy extensibility. Enhance debugging with detailed mapped_data that includes matched conditions and payload values.

## Key Design Decisions

1. **Unified Mappings Array**: Use single array with empty conditions for simple mode instead of separate simple_mapping/conditional_mappings fields - cleaner backend logic
2. **Reusable Field Constants**: Extract mapping fields (spec_type_id, workflow_id) into WEBHOOK_MAPPING_FIELDS constant for easy future extension
3. **Enhanced Debugging**: Store matched conditions with actual payload values in mapped_data for comprehensive troubleshooting

## Architecture

### File Structure

```
apps/app/
├── prisma/
│   └── schema.prisma                                    # Remove webhook_conditions
├── src/
│   ├── server/domain/webhook/
│   │   ├── constants/
│   │   │   └── webhook.constants.ts                     # Add WEBHOOK_MAPPING_FIELDS
│   │   ├── types/
│   │   │   └── webhook.types.ts                         # New WebhookConfig, MappedDataDebugInfo
│   │   ├── schemas/
│   │   │   └── webhook.schemas.ts                       # Updated validation
│   │   └── services/
│   │       ├── processWebhookEvent.ts                   # Remove webhook_conditions logic
│   │       ├── mapPayloadToWorkflowRun.ts              # Simplified unified logic
│   │       └── resolveMapping.ts                        # DELETE
│   └── client/pages/projects/webhooks/
│       ├── components/
│       │   ├── WorkflowDefinitionSelect.tsx            # NEW
│       │   ├── TestPayloadSelector.tsx                 # NEW
│       │   ├── PayloadViewDialog.tsx                   # NEW
│       │   └── ConditionalMappingsBuilder.tsx          # NEW (recreated)
│       ├── form-sections/
│       │   ├── WebhookMappingsSection.tsx              # Major redesign
│       │   └── WebhookConditionsSection.tsx            # DELETE
│       ├── field-mapping/                               # DELETE entire folder
│       └── conditions/
│           ├── ConditionEditor.tsx                      # Update for if/and labels
│           └── ConditionRow.tsx                         # Add label, showRemove props
```

### Integration Points

**Backend - Webhook Domain**:
- `constants/webhook.constants.ts` - New WEBHOOK_MAPPING_FIELDS constant
- `types/webhook.types.ts` - New types using WebhookMappingFields
- `schemas/webhook.schemas.ts` - Updated Zod validation
- `services/processWebhookEvent.ts` - Simplified pipeline
- `services/mapPayloadToWorkflowRun.ts` - Unified mapping logic

**Frontend - Webhook Pages**:
- `form-sections/WebhookMappingsSection.tsx` - Complete redesign
- `components/*.tsx` - New selector and dialog components
- `conditions/*.tsx` - UX improvements

**Database**:
- `prisma/schema.prisma` - Remove webhook_conditions field

## Implementation Details

### 1. Unified Mappings Array

Replace separate simple_mapping and conditional_mappings fields with single mappings array. Empty conditions array indicates simple mode (always matches). First matching group wins in conditional mode.

**Key Points**:
- Simple mode: exactly 1 mapping with conditions: []
- Conditional mode: 1+ mappings with conditions, first match wins
- default_action and default_mapping only used in conditional mode
- Backend loops once through mappings - cleaner than dual logic paths

### 2. Reusable Mapping Field Constants

Extract spec_type_id and workflow_id into WEBHOOK_MAPPING_FIELDS constant. Makes adding new fields (branch_name, mode, etc.) trivial - change in one place.

**Key Points**:
- Single source of truth in webhook.constants.ts
- Export both array and type for flexibility
- Use in types, validation, and UI components
- Comment shows how to extend with new fields

### 3. Enhanced Debugging Information

Store matched conditions with actual payload values in mapped_data. Enables debugging which rule matched and what values triggered it.

**Key Points**:
- mapping_conditions_matched includes payload_value for each condition
- used_default flag indicates fallback was used
- spec_content_rendered shows final template output
- Displayed in EventDetailDialog for troubleshooting

### 4. Test Payload Selector UI

Dropdown to select from recent webhook events + "View JSON" button. Selected payload used for TokenInput and condition testing.

**Key Points**:
- Fetches last 10 events for webhook
- Shows relative time and status in dropdown
- Opens PayloadViewDialog with CodeBlock syntax highlighting
- Automatically passes selected payload to TokenInput

### 5. Visual Precedence Indicators

Separators between condition groups: "if that doesn't match then" and "if nothing matches then" before default section. Makes first-match-wins logic obvious.

**Key Points**:
- Text separators in muted color between groups
- "Remove this rule" link at bottom of each group
- First condition labeled "if" with no X
- Additional conditions labeled "and" with X button

## Files to Create/Modify

### New Files (4)

1. `apps/app/src/client/pages/projects/webhooks/components/WorkflowDefinitionSelect.tsx` - Dropdown for selecting workflows
2. `apps/app/src/client/pages/projects/webhooks/components/TestPayloadSelector.tsx` - Event selector + View JSON button
3. `apps/app/src/client/pages/projects/webhooks/components/PayloadViewDialog.tsx` - Dialog with CodeBlock for JSON
4. `apps/app/src/client/pages/projects/webhooks/components/ConditionalMappingsBuilder.tsx` - Recreated for new structure

### Modified Files (11)

1. `apps/app/prisma/schema.prisma` - Remove webhook_conditions field
2. `apps/app/src/server/domain/webhook/constants/webhook.constants.ts` - Add WEBHOOK_MAPPING_FIELDS
3. `apps/app/src/server/domain/webhook/types/webhook.types.ts` - New WebhookConfig, MappedDataDebugInfo
4. `apps/app/src/server/domain/webhook/schemas/webhook.schemas.ts` - Updated validation
5. `apps/app/src/server/domain/webhook/services/processWebhookEvent.ts` - Remove webhook_conditions logic
6. `apps/app/src/server/domain/webhook/services/mapPayloadToWorkflowRun.ts` - Unified mapping resolution
7. `apps/app/src/client/pages/projects/webhooks/form-sections/WebhookMappingsSection.tsx` - Major redesign
8. `apps/app/src/client/pages/projects/webhooks/conditions/ConditionEditor.tsx` - Add if/and label support
9. `apps/app/src/client/pages/projects/webhooks/conditions/ConditionRow.tsx` - Add label and showRemove props
10. `apps/app/src/client/pages/projects/webhooks/types/webhook.types.ts` - Match backend types
11. `apps/app/src/client/pages/projects/webhooks/schemas/webhook.schemas.ts` - Match backend validation

### Files to Delete (5)

1. `apps/app/src/server/domain/webhook/services/resolveMapping.ts`
2. `apps/app/src/client/pages/projects/webhooks/form-sections/WebhookConditionsSection.tsx`
3. `apps/app/src/client/pages/projects/webhooks/field-mapping/FieldMappingEditor.tsx`
4. `apps/app/src/client/pages/projects/webhooks/field-mapping/FieldMappingRow.tsx`
5. `apps/app/src/client/pages/projects/webhooks/field-mapping/ConditionalMappingBuilder.tsx`

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend - Data Structure & Types

**Phase Complexity**: 26 points (avg 4.3/10)

- [ ] 1.1 [3/10] Remove webhook_conditions field from Prisma schema
  - Open `apps/app/prisma/schema.prisma`
  - Remove `webhook_conditions Json?` field from Webhook model
  - Run: `pnpm prisma:migrate` to create migration
  - Verify: `pnpm prisma:generate` completes successfully

- [ ] 1.2 [4/10] Add WEBHOOK_MAPPING_FIELDS constant
  - File: `apps/app/src/server/domain/webhook/constants/webhook.constants.ts`
  - Add constant: `export const WEBHOOK_MAPPING_FIELDS = ["spec_type_id", "workflow_id"] as const;`
  - Add type: `export type WebhookMappingFields = { spec_type_id: string; workflow_id: string; };`
  - Include comment showing how to extend with new fields

- [ ] 1.3 [5/10] Update webhook types to use unified mappings
  - File: `apps/app/src/server/domain/webhook/types/webhook.types.ts`
  - Remove: FieldMapping, FieldMappingType, ConditionalMapping, old WebhookConfig
  - Add: MappingMode, DefaultAction, MappingGroup (extends WebhookMappingFields), SimpleMapping (= WebhookMappingFields)
  - Update WebhookConfig with mappings array, optional default_action/default_mapping

- [ ] 1.4 [6/10] Add MappedDataDebugInfo type with payload_value
  - File: `apps/app/src/server/domain/webhook/types/webhook.types.ts`
  - Create MappedDataDebugInfo interface
  - Include: mapping_mode, mapping_conditions_matched (with payload_value), used_default, mapping, spec_content_rendered
  - mapping_conditions_matched can be array or null

- [ ] 1.5 [4/10] Update backend validation schemas
  - File: `apps/app/src/server/domain/webhook/schemas/webhook.schemas.ts`
  - Create simpleMappingSchema and mappingGroupSchema
  - Update webhookConfigSchema with mappings array validation
  - Add refine: simple mode = 1 mapping with 0 conditions, conditional mode = default_action required

- [ ] 1.6 [4/10] Update frontend types and validation
  - File: `apps/app/src/client/pages/projects/webhooks/types/webhook.types.ts`
  - Import and use WebhookMappingFields type
  - Update Webhook and WebhookConfig interfaces to match backend
  - File: `apps/app/src/client/pages/projects/webhooks/schemas/webhook.schemas.ts`
  - Update webhookFormSchema to match backend validation

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Backend - Services & Logic

**Phase Complexity**: 45 points (avg 6.4/10)

- [ ] 2.1 [8/10] Rewrite mapPayloadToWorkflowRun with unified logic
  - File: `apps/app/src/server/domain/webhook/services/mapPayloadToWorkflowRun.ts`
  - Replace entire implementation
  - Loop through config.mappings: empty conditions = always match, else evaluate
  - Build mapping_conditions_matched array with payload_value for each condition
  - Add getValueByPath helper function
  - Return mapping and MappedDataDebugInfo

- [ ] 2.2 [7/10] Update processWebhookEvent to remove webhook_conditions
  - File: `apps/app/src/server/domain/webhook/services/processWebhookEvent.ts`
  - Remove step 4 (webhook_conditions evaluation)
  - Update mapping resolution to use new mapPayloadToWorkflowRun return value
  - Pass MappedDataDebugInfo to createWebhookEvent for mapped_data field
  - Handle default_action: skip vs set_fields

- [ ] 2.3 [5/10] Delete resolveMapping service
  - File: `apps/app/src/server/domain/webhook/services/resolveMapping.ts`
  - Delete entire file (replaced by unified mapPayloadToWorkflowRun logic)

- [ ] 2.4 [6/10] Remove WORKFLOW_RUN_TABLE_FIELDS constant
  - File: `apps/app/src/server/domain/webhook/constants/webhook.constants.ts`
  - Remove WORKFLOW_RUN_TABLE_FIELDS constant if it exists
  - Replaced by WEBHOOK_MAPPING_FIELDS

- [ ] 2.5 [7/10] Update createWebhook service
  - File: `apps/app/src/server/domain/webhook/services/createWebhook.ts`
  - Update to validate new config structure with webhookConfigSchema
  - Ensure default values for mappings array in simple mode

- [ ] 2.6 [6/10] Update updateWebhook service
  - File: `apps/app/src/server/domain/webhook/services/updateWebhook.ts`
  - Update to validate new config structure
  - Handle mode switching between simple and conditional

- [ ] 2.7 [6/10] Verify workflows endpoint exists
  - Check: `GET /api/projects/:projectId/workflows` endpoint
  - File: `apps/app/src/server/routes/workflows.ts`
  - If missing, add route that returns list of workflows for project
  - Used by WorkflowDefinitionSelect component

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Frontend - Components & UI

**Phase Complexity**: 58 points (avg 5.8/10)

- [ ] 3.1 [6/10] Create WorkflowDefinitionSelect component
  - File: `apps/app/src/client/pages/projects/webhooks/components/WorkflowDefinitionSelect.tsx`
  - Similar structure to SpecTypeSelect
  - Fetch from `/api/projects/:projectId/workflows` using useQuery
  - Map workflows to options: { value: workflow.id, label: workflow.name }
  - Use Combobox component from ui

- [ ] 3.2 [7/10] Create TestPayloadSelector component
  - File: `apps/app/src/client/pages/projects/webhooks/components/TestPayloadSelector.tsx`
  - Fetch last 10 webhook events using useQuery
  - Dropdown showing "X minutes ago - status" for each event
  - "View JSON" button opens PayloadViewDialog
  - useEffect to call onPayloadSelect when selection changes
  - Disable button when no event selected

- [ ] 3.3 [5/10] Create PayloadViewDialog component
  - File: `apps/app/src/client/pages/projects/webhooks/components/PayloadViewDialog.tsx`
  - Import CodeBlock from `@/client/pages/projects/sessions/components/CodeBlock`
  - Dialog with max-w-3xl, max-h-[80vh]
  - CodeBlock with language="json", showLineNumbers=false
  - JSON.stringify(payload, null, 2) for formatted display

- [ ] 3.4 [8/10] Redesign WebhookMappingsSection
  - File: `apps/app/src/client/pages/projects/webhooks/form-sections/WebhookMappingsSection.tsx`
  - Add TestPayloadSelector at top (only if webhookId exists)
  - Add spec_content field with TokenInput using testPayload
  - Add mapping_mode RadioGroup: "Set fields" vs "Set fields conditionally"
  - Show SpecTypeSelect + WorkflowDefinitionSelect for simple mode
  - Show ConditionalMappingsBuilder for conditional mode

- [ ] 3.5 [8/10] Create ConditionalMappingsBuilder component
  - File: `apps/app/src/client/pages/projects/webhooks/components/ConditionalMappingsBuilder.tsx`
  - Map over mappings array rendering Card for each group
  - Each card: ConditionEditor, "then set" section with selects, "Remove this rule" button
  - Separators: "if that doesn't match then" between groups
  - "Add another rule" button after all groups
  - "if nothing matches then" separator before default section
  - Default section: Select for default_action, conditional selects for set_fields mode

- [ ] 3.6 [6/10] Update ConditionEditor for if/and labels
  - File: `apps/app/src/client/pages/projects/webhooks/conditions/ConditionEditor.tsx`
  - Pass label prop to ConditionRow: "if" for index 0, "and" for rest
  - Pass showRemove prop: false for index 0, true for rest
  - Keep "Add another condition" button

- [ ] 3.7 [5/10] Update ConditionRow with label and showRemove
  - File: `apps/app/src/client/pages/projects/webhooks/conditions/ConditionRow.tsx`
  - Add props: label ("if" | "and"), showRemove (boolean)
  - Render label span before inputs
  - Only render X button when showRemove is true

- [ ] 3.8 [4/10] Delete WebhookConditionsSection
  - File: `apps/app/src/client/pages/projects/webhooks/form-sections/WebhookConditionsSection.tsx`
  - Delete entire file (webhook-level conditions removed)

- [ ] 3.9 [4/10] Delete field-mapping components
  - Files in `apps/app/src/client/pages/projects/webhooks/field-mapping/`:
  - Delete FieldMappingEditor.tsx
  - Delete FieldMappingRow.tsx
  - Delete ConditionalMappingBuilder.tsx (old version)

- [ ] 3.10 [5/10] Update WebhookFormPage to remove conditions section
  - File: `apps/app/src/client/pages/projects/webhooks/WebhookFormPage.tsx`
  - Remove import and usage of WebhookConditionsSection
  - Verify form initialization includes mappings array
  - Verify mode toggle between simple and conditional updates form correctly

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: Testing & Validation

**Phase Complexity**: 13 points (avg 4.3/10)

- [ ] 4.1 [5/10] Test simple mode webhook flow
  - Create webhook with mapping_mode: "simple", 1 mapping with empty conditions
  - Trigger webhook event
  - Verify: workflow run created with correct spec_type and workflow_id
  - Verify: mapped_data shows mapping_mode: "simple"
  - Check: no default_action in config

- [ ] 4.2 [5/10] Test conditional mode with first-match-wins
  - Create webhook with 3 conditional mappings
  - Trigger event matching 2nd group
  - Verify: 2nd group's mapping used (not 3rd)
  - Verify: mapped_data shows matched conditions with payload_value
  - Verify: used_default is false

- [ ] 4.3 [3/10] Test default_action behavior
  - Create webhook with conditional mappings that don't match payload
  - Set default_action: "skip"
  - Verify: no workflow run created
  - Change default_action: "set_fields" with default_mapping
  - Verify: workflow run created with default_mapping values
  - Verify: mapped_data shows used_default: true

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`mapPayloadToWorkflowRun.test.ts`** - Test unified mapping logic:

```typescript
describe("mapPayloadToWorkflowRun", () => {
  it("matches mapping with empty conditions (simple mode)", () => {
    // Test empty conditions always matches
  });

  it("returns first matching conditional group", () => {
    // Test first-match-wins with multiple matching groups
  });

  it("includes payload_value in matched conditions", () => {
    // Verify payload_value populated from actual payload
  });

  it("uses default_mapping when no conditions match", () => {
    // Test default_action: set_fields path
  });

  it("returns null when default_action is skip", () => {
    // Test default_action: skip path
  });
});
```

### Integration Tests

**`processWebhookEvent.test.ts`** - Test full pipeline without webhook_conditions:

- Verify webhook_conditions field not evaluated
- Test mapped_data structure includes all debug info
- Test simple mode creates run immediately
- Test conditional mode evaluates groups in order

### E2E Tests

**`webhook-form.e2e.test.ts`** - Test UI flow:

- Toggle between simple and conditional modes
- Add/remove condition groups
- Use "if that doesn't match then" separators
- Test TestPayloadSelector dropdown and View JSON dialog
- Verify TokenInput uses selected test payload

## Success Criteria

- [ ] Migration removes webhook_conditions field without data loss
- [ ] Simple mode: 1 mapping with empty conditions always matches
- [ ] Conditional mode: first matching group wins
- [ ] Empty conditions array treated as always-match
- [ ] default_action="skip" doesn't create workflow run
- [ ] default_action="set_fields" uses default_mapping correctly
- [ ] spec_content template rendering works with {{tokens}}
- [ ] mapped_data stores matched conditions with payload_value
- [ ] ConditionRow: first shows "if" no X, rest show "and" with X
- [ ] "Remove this rule" button removes entire condition group
- [ ] Separators display correct text based on position
- [ ] WorkflowDefinitionSelect loads and displays workflows
- [ ] TestPayloadSelector dropdown shows recent events
- [ ] PayloadViewDialog uses CodeBlock for syntax highlighting
- [ ] WEBHOOK_MAPPING_FIELDS constant used consistently
- [ ] Form validation prevents invalid configurations
- [ ] Type checking passes with no errors
- [ ] All existing webhook tests updated and passing

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Build verification
pnpm --filter app build
# Expected: Successful build

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Unit tests
pnpm --filter app test webhook
# Expected: All webhook tests pass

# Generate Prisma client
pnpm --filter app prisma:generate
# Expected: Client generated successfully
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Project → Webhooks → Create Webhook
3. Verify: Test Payload selector appears with recent events
4. Verify: Click "View JSON" opens dialog with syntax-highlighted JSON
5. Verify: Toggle between "Set fields" and "Set fields conditionally" modes
6. Verify: In conditional mode, add multiple condition groups
7. Verify: First condition shows "if" no X, additional show "and" with X
8. Verify: Separators show "if that doesn't match then" and "if nothing matches then"
9. Verify: "Remove this rule" button removes entire group
10. Verify: Create webhook and trigger event
11. Check: Workflow run created with correct mapping
12. Check: Event detail shows mapped_data with matched conditions and payload_value

**Feature-Specific Checks:**

- Verify empty conditions array in simple mode always matches
- Test first-match-wins in conditional mode with overlapping conditions
- Verify default_action="skip" prevents workflow run creation
- Check mapped_data includes all debugging fields
- Test TokenInput uses selected test payload for suggestions
- Verify WorkflowDefinitionSelect shows all project workflows

## Implementation Notes

### 1. Migration Safety

The webhook_conditions field removal is non-destructive since it's stored as Json. Existing webhooks will lose their webhook-level conditions but conditional mappings remain intact.

### 2. Backward Compatibility

Existing webhooks with old field_mappings structure will need migration. Consider adding data migration script or handling both formats during transition period.

### 3. Type Safety

WebhookMappingFields type ensures consistency across backend and frontend. Adding new fields requires updating constant, type, and UI in sync.

### 4. Performance

Unified mappings loop is more efficient than dual evaluation paths. First-match-wins allows early exit, reducing unnecessary condition evaluations.

## Dependencies

- No new dependencies required
- Existing: Shiki (for CodeBlock syntax highlighting)
- Existing: @tanstack/react-query (for data fetching)
- Existing: Zod (for validation)

## References

- Existing SpecTypeSelect component: `apps/app/src/client/pages/projects/workflows/components/SpecTypeSelect.tsx`
- Existing CodeBlock component: `apps/app/src/client/pages/projects/sessions/components/CodeBlock.tsx`
- Existing webhook system: `apps/app/src/server/domain/webhook/`
- Root CLAUDE.md for conventions and patterns

## Next Steps

1. Review and approve this spec
2. Execute Phase 1 tasks (Backend - Data Structure & Types)
3. Run migration and verify database changes
4. Execute Phase 2 tasks (Backend - Services & Logic)
5. Test backend changes with unit tests
6. Execute Phase 3 tasks (Frontend - Components & UI)
7. Execute Phase 4 tasks (Testing & Validation)
8. Perform full manual verification
9. Update documentation if needed
10. Mark spec as completed and move to done/
