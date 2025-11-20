---
description: Generate E2E test plan for Playwright MCP from spec implementation
argument-hint: [specIdOrNameOrPath]
---

# Generate E2E Test Plan

Analyze completed spec implementation and generate comprehensive end-to-end test plan document with user stories and step-by-step browser automation directions for Playwright MCP.

**When to use**: After implementing a frontend feature with user-facing UI, when you need structured test scenarios for browser automation testing.

## Variables

- $specIdOrNameOrPath: $1 (required) - Either a timestamp ID (e.g., `2511191130`), feature name (e.g., `webhook-frontend`), or full path to spec file

## Instructions

**Critical Rules:**
- Generate test plan as USER STORIES with conversational directions, not code
- Focus on browser interactions: click, type, navigate, verify
- Map test scenarios to spec's acceptance criteria (primary) or phases (fallback)
- Detect feature type: full test plan for frontend, smoke test for backend
- Always include all template sections (strict structure for consistency)
- Use aggressive fallbacks for missing spec sections - always generate something
- Output test plan as `e2e-test-plan.md` in spec folder root (overwrite if exists)
- Output ONLY raw JSON at the end (no markdown fences, no text)

**Test Plan Requirements:**
- 3-7 user stories covering critical paths (frontend) or 2-3 smoke tests (backend)
- Each story has: pre-conditions, step-by-step actions, expected outcomes
- Include all 8 template sections: Prerequisites, Scenarios, Verification, Success Criteria, Troubleshooting, Seed Script, MCP Notes
- Database seeding: always include section with template/examples (not working code)
- No spec status validation - works for any status (draft, in-progress, review, completed)

## Spec File Resolution

**Parse and resolve $specIdOrNameOrPath:**

1. **If it's a full path** (contains `/`): use as-is
2. **Otherwise, look up in `.agent/specs/index.json`:**
   - For timestamp ID: Match by `id` field (object key)
   - For feature name: Fuzzy match path (e.g., `webhook-frontend` matches `todo/2511191130-webhook-frontend/spec.md`)
   - Use path from index: `.agent/specs/{path}`
3. **If not found in index.json, fallback to directory search:**
   - Search in order: `todo/`, `backlog/`, `done/`
   - For ID: Pattern `{id}-*/spec.md`
   - For feature name: Pattern `*{feature-name}*/spec.md` (fuzzy match)
4. **If still not found**: Report error and exit

**Example resolutions:**
- `2511191130` → `.agent/specs/todo/2511191130-webhook-frontend/spec.md`
- `webhook-frontend` → `.agent/specs/todo/2511191130-webhook-frontend/spec.md`
- `todo/2511191130-webhook-frontend/spec.md` → `.agent/specs/todo/2511191130-webhook-frontend/spec.md`

## Workflow

### 1. Resolve and Read Spec

- Use spec resolution logic above to find spec file
- If not found: output error JSON and exit
- Read spec.md to extract:
  - Feature overview and user story
  - Technical approach and architecture
  - Implementation phases and tasks
  - Files created/modified
  - Success criteria and validation steps

### 2. Detect Feature Type and Analyze

**Detect if frontend or backend:**
- Parse "Files to Create/Modify" section
- Check for frontend indicators: `**/client/**`, `**/pages/**`, `**/components/**`, mentions of "React", "UI", "form"
- If frontend files found → full test plan (browser interactions)
- If only backend files → smoke test plan (app loads, no errors)
- If unclear → treat as frontend (user can adjust)

**Analyze implementation (spec-only, no codebase exploration):**
- Review phases/tasks from spec to understand what should be built
- Identify frontend pages/components from "Files to Create/Modify" (e.g., ProjectWebhooksPage.tsx → list view test)
- Map user flows from spec's "User Story" and "Technical Approach" sections
- Note integration points mentioned: API routes, WebSocket events, database models
- Identify critical paths vs edge cases from phases

### 3. Identify Test Scenarios

**Scenario Selection Strategy (Hybrid):**

1. **Primary: Extract from Success Criteria**
   - Parse spec's "Success Criteria" section
   - Each criterion becomes a test scenario (e.g., "User can create webhook with name and source only" → "Create new webhook")
   - Group related criteria into single stories (e.g., all "field mapping" criteria → one "Configure field mappings" story)

2. **Fallback: Map from Phases**
   - If success criteria missing/vague, use implementation phases:
     - Phase mentions "List View" → generate "View webhooks list" test
     - Phase mentions "Form" or "Create" → generate "Create item" test
     - Phase mentions "Detail Page" → generate "View detail page" test
     - Phase mentions "Edit" → generate "Edit item" test

3. **Add Common Scenarios** (if not covered above):
   - Empty state (if list view exists)
   - Basic error handling (form validation, 404s)
   - Login/app loads (always include for smoke tests)

**For Frontend Features - Generate 3-7 stories:**
- Critical paths: load, create, list, edit, detail
- Edge cases: validation errors, real-time updates, delete

**For Backend Features - Generate 2-3 smoke tests:**
- Story 1: App loads without errors
- Story 2: User can log in
- Story 3: Navigate to relevant section (if applicable)

**For each scenario, determine:**
- Pre-conditions (what data should exist?)
- Browser actions (click, type, navigate)
- Expected outcomes (what appears on screen?)
- Verification points (specific elements to check)

### 4. Generate Test Plan Document

Create `e2e-test-plan.md` in spec folder with structure:

```markdown
# [Feature Name] E2E Test Plan

**Purpose**: Step-by-step directions for Playwright MCP...

## Prerequisites

### 1. Start the Application
[Commands to start app, ports to check]

### 2. Database Seeding (if needed)
[Script to insert test data for scenarios that need pre-existing records]

---

## Test Scenarios

### Story 1: [First Critical Path]

**Pre-conditions**:
- [What should exist before this test]

**Steps**:
1. **[Action]**
   - [Detailed browser action]
   - [What to verify]

**Expected Outcome**: [What success looks like]

---

[Repeat for each user story]

---

## Additional Verification Points

### Responsiveness
[Mobile/tablet testing notes]

### Error Handling
[Validation, error messages]

### Loading States
[Spinners, skeletons]

### Console Errors
[No errors expected]

---

## Success Criteria

- ✅ All N user stories complete without errors
- ✅ No console errors during testing
- ✅ [Feature-specific criteria]

---

## Troubleshooting

### If [common issue]
- [Solution steps]

---

## Database Seed Script

[Prisma or SQL script to create test data]

---

## Notes for Playwright MCP

- Wait for page loads and navigation
- Use appropriate selectors (prefer data-testid)
- Take screenshots at key points
- Handle dynamic IDs appropriately
```

### 5. Generate Database Seed Script Templates

**Always include Database Seed Script section (even if no seeding needed).**

**If scenarios need pre-existing data (edit, detail, delete flows):**
- Create Prisma Client seed script TEMPLATE (not working code)
- Include example data structure based on models mentioned in spec
- Use placeholder values: `// Replace with actual project ID`
- Show structure for main models and relationships
- Provide two approaches: Prisma Client script + Prisma Studio GUI

**If no seeding needed (only create/list flows):**
- Include section with note: "No database seeding required - all scenarios test creation flows from scratch"

**Template format:**
```typescript
// apps/app/prisma/seed-test-{feature}.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTest{Feature}() {
  const projectId = "your-project-id-here"; // Replace with actual ID

  // Create main entity
  const entity = await prisma.{model}.create({
    data: {
      id: "test-{model}-001",
      project_id: projectId,
      // ... other fields with example values
    }
  });

  console.log("✅ Test data seeded successfully!");
}

seedTest{Feature}()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Extract model names from:**
- Spec's "Files to Create/Modify" (look for `prisma/schema.prisma` changes)
- Spec's "Architecture" or "Database Models" sections
- Fallback: use generic "entity" if models unclear

### 6. Write Test Plan File

- Output to: `{spec_folder}/e2e-test-plan.md` (root of spec folder)
- Overwrite if file exists (test plans are regeneratable)
- Use full template structure (all 8 sections, strict)
- Write conversational directions (not code)
- Include all verification points and troubleshooting
- Ensure each step is actionable for browser automation
- Add note if fallbacks were used (e.g., "Generated from phases - no success criteria found")

### 7. Report Results

Output ONLY raw JSON (no markdown fences, no XML tags, no explanatory text).

## Test Plan Template

Use this structure as base, customize for specific feature:

**Sections (in order):**
1. **Title and Purpose** - What this test plan covers
2. **Prerequisites** - App startup, database seeding
3. **Test Scenarios** - 3-7 user stories with detailed steps
4. **Additional Verification** - Responsiveness, errors, loading
5. **Success Criteria** - Checklist of what "passing" means
6. **Troubleshooting** - Common issues and solutions
7. **Database Seed Script** - If needed for any scenario
8. **Notes for Playwright MCP** - Automation-specific tips

**Each User Story Format:**
- **Title**: Verb-first, action-oriented (e.g., "Create new webhook")
- **Pre-conditions**: List what must exist/be true before test
- **Steps**: Numbered list with bold action headings, bullet sub-steps
- **Expected Outcome**: One-sentence success summary

**Writing Style:**
- Conversational, directive tone ("Click the button", "Verify text appears")
- Specific selectors/text when possible ("Look for button: 'Create Webhook'")
- Focus on what to DO and what to VERIFY
- Avoid implementation details (no "render component", use "page displays")

**Backend Feature Smoke Test Template:**

If feature is backend-only (no frontend components), generate minimal smoke test plan:

```markdown
# [Feature Name] E2E Smoke Test Plan

**Purpose**: Verify backend changes don't break application functionality.

## Prerequisites
[Standard app startup]

## Test Scenarios

### Story 1: Application Loads Successfully
**Pre-conditions**: None
**Steps**:
1. Navigate to app home page
2. Verify page loads without errors
3. Check console for JavaScript errors

**Expected Outcome**: App loads, no errors in console.

---

### Story 2: User Authentication Works
**Pre-conditions**: Valid user credentials exist
**Steps**:
1. Navigate to login page
2. Enter credentials and submit
3. Verify successful login and redirect

**Expected Outcome**: User logged in, redirected to dashboard.

---

### Story 3: Navigation Functions Correctly
**Pre-conditions**: User logged in
**Steps**:
1. Click through main navigation sections
2. Verify each page loads
3. Check console for errors

**Expected Outcome**: All pages accessible, no errors.

---

## Success Criteria
- ✅ App loads without errors
- ✅ Authentication flow works
- ✅ No console errors during navigation
- ✅ Backend changes don't break frontend

> **Note**: This is a backend feature. E2E tests verify app stability only.
> For API endpoint testing, use integration tests or API test tools.
```

## Common Test Scenarios by Feature Type

### CRUD Features (List/Create/Edit/Delete)
1. Load page with empty state
2. Create new item
3. View item in list
4. Edit existing item
5. View detail page
6. Delete item (optional)

### Form-Heavy Features
1. Form validation (empty fields, invalid input)
2. Multi-step forms (wizard navigation)
3. Dynamic fields (add/remove items)
4. Save draft vs submit
5. Unsaved changes warning

### Real-Time Features (WebSocket)
1. Initial state load
2. Trigger event (simulate or seed)
3. Verify UI updates without refresh
4. Test reconnection scenarios

### Data Display Features
1. Table/list rendering
2. Filtering and search
3. Sorting
4. Pagination
5. Empty states
6. Loading states

## Handling Missing Spec Sections (Aggressive Fallbacks)

**Goal**: Always generate something useful, even if spec is incomplete or non-standard.

**Fallback Hierarchy:**

| Missing Section | Fallback Strategy |
|----------------|-------------------|
| **User Story** | Use "Overview" section → Use first paragraph of spec → Generate generic story from feature name |
| **Success Criteria** | Extract from phase task names → Use phase titles → Generate standard CRUD scenarios |
| **Files to Create/Modify** | Grep spec for "page", "component", "form" mentions → Assume basic UI based on feature name |
| **Technical Approach** | Use "Implementation Details" → Use phase descriptions → Skip (not critical) |
| **Phases/Tasks** | Extract numbered lists from spec → Use markdown headings → Generate minimal scenarios |

**Only fail with error if:**
- Spec file doesn't exist (handled in resolution step)
- Spec file is completely empty (< 50 characters)
- Spec contains only frontmatter, no content

**Add metadata note if fallbacks used:**
```markdown
> **Note**: This test plan was generated with limited spec information.
> Success criteria not found - scenarios derived from implementation phases.
> Review and adjust as needed.
```

## Example Spec-to-Test-Story Mapping

**From Spec Success Criteria:**
- "User can create webhook with name and source only"
  → **Test Story**: "Create new webhook with minimal info"

- "Form sections locked until test event received"
  → **Test Story**: "Verify locked sections until test event" (with seeded test event)

- "Token picker shows all fields from test payload"
  → **Test Story**: "Use token picker to map webhook fields" (with seeded payload)

**From Spec Phases:**
- Phase 2: List View
  → **Test Stories**: "Load empty list", "View webhook in list"

- Phase 4: Form Sections
  → **Test Story**: "Create and configure webhook form"

## Report

**IMPORTANT**: Output ONLY raw JSON (see `.agent/docs/slash-command-json-output-format.md`).

Do NOT include markdown fences, XML tags, or explanatory text. Just the JSON object:

**On success:**
```json
{
  "success": true,
  "spec_id": "2511191130",
  "spec_file": ".agent/specs/todo/2511191130-webhook-frontend/spec.md",
  "test_plan_file": ".agent/specs/todo/2511191130-webhook-frontend/e2e-test-plan.md",
  "scenario_count": 5,
  "feature_type": "frontend"
}
```

**Field descriptions:**
- `success`: Always `true` if test plan generated
- `spec_id`: Timestamp ID extracted from spec folder name (10 digits)
- `spec_file`: Full path to spec.md that was analyzed
- `test_plan_file`: Full path to generated e2e-test-plan.md
- `scenario_count`: Number of test scenarios/stories generated
- `feature_type`: Either `"frontend"` (full test plan) or `"backend"` (smoke test)

**On error** (spec not found):

```json
{
  "success": false,
  "error": "Spec not found: webhook-nonexistent",
  "searched_paths": [
    ".agent/specs/index.json",
    ".agent/specs/todo/*webhook-nonexistent*/spec.md",
    ".agent/specs/backlog/*webhook-nonexistent*/spec.md",
    ".agent/specs/done/*webhook-nonexistent*/spec.md"
  ]
}
```

**On error** (spec file empty/unreadable):

```json
{
  "success": false,
  "error": "Spec file is empty or unreadable",
  "spec_file": ".agent/specs/todo/2511191130-webhook-frontend/spec.md"
}
```
