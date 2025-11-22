# Webhook Frontend E2E Test Plan

**Purpose**: Step-by-step directions for Playwright MCP to test the webhook frontend feature through browser automation.

**Date**: 2025-11-19
**Status**: Partially Complete (2/5 stories done)
**Test Environment**: Local development (`http://localhost:5173`)
**Last Updated**: 2025-11-19 (after first test run)

---

## Known Issues Fixed During Testing

1. **getWebhooksByProject JSON parsing bug** - Fixed incorrect `JSON.parse()` on already-parsed Prisma JSON field
2. **createWebhook JSON serialization bug** - Fixed incorrect `JSON.stringify()` on Prisma JSON field
3. **Route parameter mismatch** - Fixed `projectId` vs `id` parameter extraction from React Router
4. **WebhookBasicInfoSection create mode** - Added proper create mode support (editable fields, source dropdown, hide URL/secret)
5. **WebhookFormPage create/edit logic** - Updated to handle both create and edit modes correctly

---

## Prerequisites

### 1. Start the Application

```bash
cd apps/app
pnpm dev
```

Wait for:

- Frontend running on `http://localhost:5173`
- Backend running on `http://localhost:3456`
- Console shows "Server listening at http://localhost:3456"

**IMPORTANT**: After any server-side code changes, run `pnpm build:server` from `apps/app/` directory. The dev server uses the built version.

### 2. Authentication

**Test Credentials**:
- Email: `admin@example.com`
- Password: `password`

**Login URL**: `http://localhost:5173/login`

**Project ID**: Get the first project from the database:
```bash
cd apps/app && npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.project.findFirst().then(proj => { console.log(proj?.id || 'NO_PROJECT'); p.\$disconnect(); })"
```

### 3. Database Seeding (for Edit Flow Tests)

**Why**: The edit flow requires a webhook with a test event payload. Since we can't trigger real webhook events in testing, we'll seed the database directly.

**Seed Command** (run from `apps/app/`):

```bash
# Create webhook with test event using Prisma Studio or direct SQL
# This will be executed before Story 4 (Edit Webhook)
```

**Seed Data Structure**:

```typescript
// Webhook to create:
{
  id: "test-webhook-001",
  project_id: "{existing_project_id}",
  name: "Pre-seeded Test Webhook",
  description: "Webhook with test data for editing",
  source: "github",
  status: "draft",
  workflow_identifier: null,
  webhook_url: "http://localhost:3456/api/webhooks/test-webhook-001",
  secret: "test_secret_123456",
  config: {
    field_mappings: [],
    source_config: {}
  },
  conditions: []
}

// WebhookEvent to create:
{
  id: "test-event-001",
  webhook_id: "test-webhook-001",
  status: "test",
  payload: {
    "action": "opened",
    "pull_request": {
      "number": 123,
      "title": "Add new feature",
      "user": {
        "login": "testuser"
      },
      "body": "This is a test PR description"
    },
    "repository": {
      "name": "test-repo",
      "full_name": "org/test-repo"
    }
  },
  headers: {
    "x-github-event": "pull_request"
  },
  created_at: new Date().toISOString()
}
```

---

## Test Scenarios

### Story 1: App Loads and Displays Empty Webhooks List ✅ PASSED

**Status**: ✅ COMPLETE

**Pre-conditions**:

- User is logged in as `admin@example.com`
- Project exists with ID accessible via URL
- No webhooks exist for this project yet

**Steps**:

1. **Navigate to project webhooks page**
   - Go to: `http://localhost:5173/projects/{project_id}/webhooks`
   - Replace `{project_id}` with actual project ID from database

2. **Verify page loads successfully**
   - ✅ Check URL is correct
   - ✅ Page title contains "Webhooks"
   - ✅ No console errors

3. **Verify empty state displays**
   - ✅ Look for text: "No webhooks yet"
   - ✅ Look for button: "Create Your First Webhook" and "Create Webhook" in header
   - ✅ Verify empty state icon/illustration appears

4. **Verify navigation elements**
   - ✅ Breadcrumb/navigation shows correct project context
   - ✅ Page header shows "Webhooks" heading

**Expected Outcome**: ✅ Empty state is clear and inviting, with obvious next action (create webhook).

**Test Results**: All assertions passed. Empty state renders correctly.

---

### Story 2: Create New Webhook ⚠️ BLOCKED

**Status**: ⚠️ BLOCKED - Server crash during webhook creation

**Pre-conditions**:

- On project webhooks list page (from Story 1)
- User has permission to create webhooks

**Steps**:

1. **Click create webhook button** ✅
   - Click the "Create Your First Webhook" button from empty state
   - Verify navigation to: `/projects/{project_id}/webhooks/new`

2. **Verify form page loads** ✅
   - ✅ Page title shows "Create Webhook"
   - ✅ Form is visible with required fields:
     - Name (textbox, editable)
     - Description (textarea, editable, optional)
     - Source (dropdown with GitHub, Linear, Jira, Generic)
   - ✅ NO URL/Secret fields shown (they appear after creation)
   - ✅ "Create Draft" button visible and enabled

3. **Fill in basic information** ✅
   - ✅ **Name field**: Type "GitHub PR Webhook"
   - ✅ **Description field** (optional): Type "Triggers workflow on PR events"
   - ✅ **Source dropdown**: Default is "GitHub" (can change if needed)

4. **Verify form validation** ⏸️ NOT TESTED
   - Try clicking "Create Draft" without filling name
   - Verify error message appears: "Name is required" or similar
   - Fill in name again

5. **Create the webhook** ❌ BLOCKED
   - Click "Create Draft" button
   - **ISSUE**: Server returns 500 error and crashes
   - **Root Cause**: `createWebhook` service has incorrect JSON handling for Prisma
   - **Fix Applied**: Changed `JSON.stringify(config)` to `config as any` for Prisma JSON fields
   - **Blocker**: Server needs restart after build, dev watcher didn't auto-restart

6. **Verify redirect to edit page** ⏸️ NOT TESTED
   - URL should change to: `/projects/{project_id}/webhooks/{webhook_id}/edit`
   - Page should show the webhook name you entered

7. **Verify webhook URL and secret are displayed**
   - Look for section showing "Webhook URL"
   - Verify URL is visible (e.g., `http://localhost:3456/api/webhooks/...`)
   - Look for "Copy" button next to URL
   - Look for "Webhook Secret" field
   - Verify secret is masked (shows dots/asterisks)
   - Look for "Reveal" or eye icon button next to secret

8. **Test URL copy functionality**
   - Click "Copy" button next to webhook URL
   - Verify toast appears: "URL copied" or similar

9. **Test secret reveal functionality**
   - Click eye/reveal icon on secret field
   - Verify secret is now visible (plain text)
   - Click eye/reveal icon again
   - Verify secret is masked again

10. **Verify sections are locked (waiting for test event)**
    - Look for "Workflow" section - should show disabled/locked state
    - Look for "Field Mappings" section - should show disabled/locked state
    - Look for "Conditions" section - should show disabled/locked state
    - Verify messaging like "Waiting for test event" or "Send a test webhook to unlock configuration"

**Expected Outcome**: Webhook created successfully, URL/secret visible and functional, form sections locked until test event.

---

### Story 3: View Webhook in List

**Pre-conditions**:

- Webhook created in Story 2
- Currently on webhook edit page

**Steps**:

1. **Navigate back to webhooks list**
   - Click "Webhooks" in breadcrumb OR
   - Navigate to: `http://localhost:5173/projects/{project_id}/webhooks`

2. **Verify webhook appears in list**
   - Look for webhook card/row with name "GitHub PR Webhook"
   - Verify it's no longer an empty state

3. **Verify webhook card displays correct information**
   - **Name**: "GitHub PR Webhook"
   - **Source**: Shows GitHub icon or "GitHub" text
   - **Status badge**: Shows "Draft" (or equivalent status)
   - **Last triggered**: Shows "Never" or "No events yet"

4. **Verify webhook card actions**
   - Look for dropdown menu (three dots icon) on card
   - Click dropdown menu
   - Verify options appear: "View", "Edit", "Delete" (or similar)
   - Click outside to close dropdown

5. **Test clicking webhook card**
   - Click anywhere on the webhook card (not the dropdown)
   - Verify navigation to detail page: `/projects/{project_id}/webhooks/{webhook_id}`

**Expected Outcome**: Webhook visible in list with correct info, card is clickable, dropdown menu works.

---

### Story 4: Edit Webhook with Pre-Seeded Test Data

**Pre-conditions**:

- **IMPORTANT**: Run database seed script to create "Pre-seeded Test Webhook" with test event (see Prerequisites section)
- Navigate to: `http://localhost:5173/projects/{project_id}/webhooks/test-webhook-001/edit`
- This webhook already has a test event in the database, so sections should be unlocked

**Steps**:

1. **Verify edit page loads with unlocked sections**
   - Page title shows "Edit Webhook" or webhook name
   - Basic info section shows pre-filled data:
     - Name: "Pre-seeded Test Webhook"
     - Source: "GitHub"
     - URL and secret are visible
   - Verify sections are NOT locked (should be editable):
     - Workflow section visible
     - Field Mappings section visible
     - Conditions section visible

2. **Edit basic information**
   - Change name to: "Updated GitHub PR Webhook"
   - Update description to: "Edited webhook for testing"
   - Verify changes are reflected in form

3. **Select a workflow**
   - In "Workflow" section, click the workflow dropdown/combobox
   - Verify dropdown shows list of available workflows
   - Select any workflow from the list
   - Verify selected workflow appears in the field

4. **Add a field mapping**
   - In "Field Mappings" section, click "Add Mapping" button
   - Verify a new mapping row appears with:
     - Field name input (e.g., "issue_number")
     - Type selector (defaults to "Input" or shows "Input"/"Conditional")
     - Value input field

5. **Test token picker in value field**
   - In the value field, type "/" (forward slash)
   - Verify token picker popup appears
   - Verify picker shows available tokens from test payload:
     - `payload.action`
     - `payload.pull_request.number`
     - `payload.pull_request.title`
     - `payload.pull_request.user.login`
     - `payload.repository.name`
     - etc.
   - Verify each token shows a preview value next to it (e.g., "opened", "123", "Add new feature")

6. **Select a token**
   - Click on `payload.pull_request.number` from picker
   - Verify value field updates to: `{{payload.pull_request.number}}`
   - Verify picker closes

7. **Test token picker with "+" button**
   - Add another field mapping (click "Add Mapping")
   - In the new value field, click the "+" button (if available)
   - Verify token picker opens
   - Select `payload.pull_request.title`
   - Verify value field shows: `{{payload.pull_request.title}}`

8. **Add a conditional mapping (optional, if UI supports)**
   - Add another mapping
   - In field name, type: "priority"
   - Change type from "Input" to "Conditional"
   - Verify UI changes to show condition builder
   - Add a condition:
     - Path: `payload.pull_request.user.login`
     - Operator: "equals"
     - Value: "testuser"
   - Set result value: "high"

9. **Add webhook-level conditions**
   - In "Conditions" section, click "Add Condition"
   - Verify new condition row appears
   - Fill in condition:
     - Path: `payload.action` (or use "/" token picker)
     - Operator: Select "equals"
     - Value: "opened"
   - Verify condition is added

10. **Test removing items**
    - Add one more field mapping
    - Click remove/delete button on the last mapping
    - Verify it disappears from the list
    - Add one more condition
    - Remove it
    - Verify it's removed

11. **Save the webhook**
    - Click "Save Draft" button at bottom of form
    - Wait for success toast: "Webhook updated" or similar
    - Verify form doesn't show unsaved changes indicator

12. **Test activate flow (if webhook has workflow selected)**
    - If workflow was selected, click "Activate" button
    - Verify confirmation dialog or direct activation
    - Wait for success toast: "Webhook activated"
    - Verify status badge changes to "Active"

**Expected Outcome**: All form sections work correctly, token picker shows real payload data, field mappings and conditions can be added/removed, webhook saves successfully.

---

### Story 5: View Webhook Detail Page and Event History

**Pre-conditions**:

- "Pre-seeded Test Webhook" exists with test event (from Story 4)
- Navigate to: `http://localhost:5173/projects/{project_id}/webhooks/test-webhook-001`

**Steps**:

1. **Verify detail page loads**
   - Page title shows webhook name: "Updated GitHub PR Webhook" (or original name)
   - Breadcrumb shows: "Projects > {Project Name} > Webhooks > {Webhook Name}"

2. **Verify webhook information section**
   - Name is displayed
   - Description is displayed
   - Source shows "GitHub" with icon
   - Status badge shows current status (Draft/Active/Paused)
   - Webhook URL is visible

3. **Verify action buttons**
   - Look for buttons: "Edit", "Activate/Pause", "Rotate Secret", "Delete"
   - Verify "Edit" button is clickable
   - Click "Edit" button
   - Verify navigation to: `/projects/{project_id}/webhooks/{webhook_id}/edit`
   - Navigate back to detail page

4. **Verify configuration display (read-only)**
   - Look for "Configuration" or "Settings" section
   - Verify selected workflow is shown (if any)
   - Verify field mappings are displayed (read-only)
   - Verify conditions are displayed (read-only)

5. **Verify event history section**
   - Look for "Event History" or "Recent Events" section
   - Verify table/list shows the pre-seeded test event:
     - Status: "Test" or test indicator
     - Timestamp: Shows date/time
     - Details: Option to view more

6. **Test event history filtering**
   - Look for status filter dropdown (All, Test, Success, Failed, Filtered)
   - Click filter dropdown
   - Select "Test"
   - Verify only test events are shown

7. **View event details**
   - Click on the test event row OR click "View Details" button
   - Verify event detail modal/dialog opens
   - Verify modal has tabs or sections:
     - **Payload tab**: Shows formatted JSON of webhook payload
     - **Headers tab**: Shows request headers
     - **Mapped Data tab** (if available): Shows transformed data
     - **Error tab** (if error exists): Shows error message

8. **Inspect payload tab**
   - Click "Payload" tab (if not already selected)
   - Verify JSON is formatted and readable
   - Look for the test payload data:
     ```json
     {
       "action": "opened",
       "pull_request": {
         "number": 123,
         "title": "Add new feature",
         ...
       }
     }
     ```

9. **Inspect headers tab**
   - Click "Headers" tab
   - Verify headers are displayed
   - Look for header like: `"x-github-event": "pull_request"`

10. **Close event detail dialog**
    - Click close button or click outside modal
    - Verify modal closes and returns to detail page

**Expected Outcome**: Detail page shows comprehensive webhook info, event history displays test event, event details modal shows full payload and headers.

---

## Additional Verification Points

### Responsiveness

- Resize browser window to mobile/tablet sizes
- Verify UI adapts properly
- Verify dropdowns and modals work on smaller screens

### Error Handling

- Try creating webhook with duplicate name (if validation exists)
- Try saving field mapping without field name
- Verify appropriate error messages appear

### Loading States

- Watch for loading spinners/skeletons during:
  - Page navigation
  - Webhook list fetch
  - Webhook save operations
  - Event history fetch

### Console Errors

- Keep browser DevTools console open throughout testing
- Verify no JavaScript errors appear during any flow
- Verify no React warnings about keys, hooks, etc.

---

## Success Criteria

- ✅ All 5 user stories complete without errors
- ✅ No console errors during testing
- ✅ All UI elements (buttons, dropdowns, modals) function correctly
- ✅ Token picker shows real test payload data with previews
- ✅ Field mappings and conditions can be added/edited/removed
- ✅ Webhook creation, editing, and viewing all work end-to-end
- ✅ Event history displays pre-seeded test event correctly

---

## Troubleshooting

### If sections remain locked after seeding

- Verify test event was created in database
- Verify `status = 'test'` on WebhookEvent record
- Check browser console for WebSocket connection issues
- Refresh the page

### If token picker is empty

- Verify test event has `payload` field populated
- Check that payload is valid JSON object
- Verify event is associated with correct webhook ID

### If workflows don't appear in dropdown

- Verify project has at least one workflow definition
- Check API endpoint: `GET /api/projects/{project_id}/workflows`
- Verify workflow has required fields (identifier, name)

---

## Database Seed Script

**Location**: Run from `apps/app/` directory

**Method 1: Using Prisma Client** (create a seed script):

```typescript
// apps/app/prisma/seed-test-webhook.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTestWebhook() {
  const projectId = "your-project-id-here"; // Replace with actual project ID

  // Create webhook
  const webhook = await prisma.webhook.create({
    data: {
      id: "test-webhook-001",
      project_id: projectId,
      name: "Pre-seeded Test Webhook",
      description: "Webhook with test data for editing",
      source: "github",
      status: "draft",
      workflow_identifier: null,
      webhook_url: "http://localhost:3456/api/webhooks/test-webhook-001",
      secret: "test_secret_123456",
      config: {
        field_mappings: [],
        source_config: {},
      },
      conditions: [],
    },
  });

  // Create test event
  await prisma.webhookEvent.create({
    data: {
      id: "test-event-001",
      webhook_id: webhook.id,
      status: "test",
      payload: {
        action: "opened",
        pull_request: {
          number: 123,
          title: "Add new feature",
          user: {
            login: "testuser",
          },
          body: "This is a test PR description",
        },
        repository: {
          name: "test-repo",
          full_name: "org/test-repo",
        },
      },
      headers: {
        "x-github-event": "pull_request",
      },
    },
  });

  console.log("✅ Test webhook seeded successfully!");
}

seedTestWebhook()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run**: `npx tsx prisma/seed-test-webhook.ts`

**Method 2: Using Prisma Studio** (GUI):

```bash
npx prisma studio
```

Then manually create Webhook and WebhookEvent records using the data structure above.

---

## Notes for Playwright MCP

- Wait for page loads and navigation completions
- Use appropriate selectors (prefer data-testid attributes if available)
- Wait for elements to be visible before interacting
- Take screenshots at key verification points
- Handle dynamic IDs (webhook IDs, project IDs) appropriately
- Some operations may require waiting for API responses (use network idle or explicit waits)

---

## Test Execution Summary (2025-11-19)

### Completed
- ✅ Story 1: Empty webhooks list - PASSED
- ⚠️ Story 2: Create webhook form - UI works, server issue blocking completion

### Bugs Fixed
1. **getWebhooksByProject** - Removed `JSON.parse()` on Prisma JSON field
2. **createWebhook** - Fixed JSON serialization using `Prisma.InputJsonValue`
3. **Route params** - Changed `projectId` to `id` in useParams
4. **WebhookBasicInfoSection** - Added create mode support
5. **WebhookFormPage** - Implemented dual create/edit mode logic
6. **Schema** - Added `source` field to UpdateWebhookFormValues

### Next Steps for Tester

1. **Restart the dev server** to pick up fixed createWebhook service:
   ```bash
   # Kill and restart
   cd apps/app
   # Kill existing processes on ports 3456 and 5173
   lsof -ti:3456,5173 | xargs kill
   # Wait a few seconds, then restart
   pnpm dev
   ```

2. **Verify webhook creation works**:
   - Fill out form: name, description, source
   - Click "Create Draft"
   - Should redirect to edit page with URL and secret displayed

3. **Continue with remaining stories** (3-5):
   - Story 3: View webhook in list
   - Story 4: Edit webhook with test data
   - Story 5: View webhook detail and events

### Known Limitations

- **Dev server doesn't auto-reload** after `pnpm build:server` - manual restart required
- **Test webhook seeding** needed for Story 4 (edit flow with test event)
- **Stories 3-5** not tested yet, may reveal additional issues

