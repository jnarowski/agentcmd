# AI Naming Service for Workflow Runs

**Status**: draft
**Created**: 2025-11-06
**Package**: apps/web
**Total Complexity**: 34 points
**Phases**: 3
**Tasks**: 11
**Overall Avg Complexity**: 5.5/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Backend - AI Service & Endpoint | 3 | 16 | 5.3/10 | 7/10 |
| Phase 2: Frontend - UI Refactor | 5 | 16 | 5.2/10 | 7/10 |
| Phase 3: Testing & Validation | 3 | 6 | 3.0/10 | 4/10 |
| **Total** | **11** | **38** | **5.5/10** | **7/10** |

## Overview

Add AI-powered name generation for workflow runs by analyzing spec file contents. When a user selects a spec file, automatically generate a descriptive execution name and git branch name using Claude Sonnet 4.5, improving UX and reducing manual input.

## User Story

As a workflow run creator
I want the system to automatically suggest execution and branch names from spec files
So that I don't have to manually come up with names and can start executions faster

## Technical Approach

1. Create backend AI service using Vercel AI SDK's `generateObject()` for structured output
2. Add REST endpoint that reads spec file and calls AI service
3. Refactor frontend dialog to use Combobox for spec selection with auto-triggering AI generation
4. Silent fallback when ANTHROPIC_API_KEY not configured (graceful degradation)

## Key Design Decisions

1. **Single API call pattern**: Backend reads file + generates names atomically (vs separate file read endpoint)
2. **Structured generation**: Use `generateObject()` with Zod schema vs `generateText()` for type-safe output
3. **Auto-trigger**: Generate names immediately on spec selection (vs manual button trigger)
4. **Silent fallback**: Return null when no API key (vs throwing errors or showing messages)
5. **Combobox UI**: Replace Tabs+Select with searchable Combobox for better UX

## Architecture

### File Structure
```
apps/web/src/
├── server/
│   ├── domain/
│   │   └── workflow/
│   │       └── services/
│   │           ├── generateExecutionNames.ts  [NEW]
│   │           └── index.ts                   [MODIFIED - export]
│   └── routes/
│       └── workflows.ts                        [MODIFIED - add endpoint]
│
└── client/
    └── pages/projects/workflows/components/
        └── NewExecutionDialog.tsx              [MODIFIED - major refactor]
```

### Integration Points

**Backend - Workflow Domain**:
- `apps/web/src/server/domain/workflow/services/generateExecutionNames.ts` - New AI service
- `apps/web/src/server/domain/workflow/services/index.ts` - Export new function
- `apps/web/src/server/routes/workflows.ts` - New POST endpoint

**Backend - File Domain** (existing, no changes):
- Uses existing `readFile()` service from `@/server/domain/file/services`

**Frontend - Workflow Components**:
- `apps/web/src/client/pages/projects/workflows/components/NewExecutionDialog.tsx` - Replace spec selection UI, add AI generation logic

## Implementation Details

### 1. AI Service Function (`generateExecutionNames`)

Creates a new domain service that uses Claude Sonnet 4.5 to extract feature goals from spec content and generate structured names.

**Key Points**:
- Uses `generateObject()` from Vercel AI SDK with Zod schema for type safety
- Truncates spec to first 2000 chars to control token costs
- Returns `{ executionName: string, branchName: string }` or `null`
- Silent fallback if no ANTHROPIC_API_KEY (checks `config.get('apiKeys').anthropicApiKey`)
- Temperature 0.7 for balanced creativity
- Execution name: 3-6 words, Title Case (e.g., "Fix Auth Flow Bug")
- Branch name: 2-4 words, kebab-case with prefixes (e.g., "feat/auth-fix")

### 2. REST Endpoint (`POST /api/workflows/generate-names-from-spec`)

Provides HTTP interface for AI name generation by reading spec file and calling service.

**Key Points**:
- Protected route with `preHandler: fastify.authenticate`
- Request body: `{ projectId: string, specFile: string }`
- Validates project exists via `getProjectById()`
- Reads spec from `.agent/specs/todo/{specFile}` using existing `readFile()` service
- Returns `{ data: { executionName: string, branchName: string } | null }`
- 404 if project or spec not found, 500 on unexpected errors

### 3. Frontend Dialog Refactor

Major UI update to replace Tabs+Select with Combobox and add automatic AI generation.

**Key Points**:
- Remove `specMode` state (no more File/Content tabs)
- Remove `specContent` state (backend handles file reading)
- Add `isGeneratingNames` boolean state for loading UI
- Move spec selection to top of form (before execution name)
- Replace `Tabs` + `Select` with `Combobox` component (like branch selector)
- Auto-trigger AI generation via `useEffect` when `specFile` changes
- Show loading spinner in name field during generation
- Populate `name`, `branchName`, and `worktreeName` with AI results
- Keep fields editable after generation
- Silent failure on error (leave fields empty, no toast)

## Files to Create/Modify

### New Files (1)

1. `apps/web/src/server/domain/workflow/services/generateExecutionNames.ts` - AI service for name generation

### Modified Files (3)

1. `apps/web/src/server/domain/workflow/services/index.ts` - Export `generateExecutionNames`
2. `apps/web/src/server/routes/workflows.ts` - Add POST endpoint for name generation
3. `apps/web/src/client/pages/projects/workflows/components/NewExecutionDialog.tsx` - Refactor spec selection UI and add AI logic

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend - AI Service & Endpoint

**Phase Complexity**: 16 points (avg 5.3/10)

<!-- prettier-ignore -->
- [x] `ai-service-1` [6/10] Create `generateExecutionNames` AI service function
  - Implement using Vercel AI SDK `generateObject()` with Claude Sonnet 4.5
  - Define Zod schema for structured output (executionName, branchName)
  - Add system prompt with examples and rules for name generation
  - Truncate spec content to 2000 chars
  - Return null if no ANTHROPIC_API_KEY (silent fallback)
  - File: `apps/web/src/server/domain/workflow/services/generateExecutionNames.ts`
  - Temperature: 0.7

- [x] `ai-service-2` [3/10] Export new service from barrel file
  - Add export statement for `generateExecutionNames`
  - File: `apps/web/src/server/domain/workflow/services/index.ts`
  - Command: None (single line change)

- [x] `ai-endpoint-1` [7/10] Add POST endpoint for AI name generation
  - Route: `POST /api/workflows/generate-names-from-spec`
  - Add `preHandler: fastify.authenticate` for auth
  - Define Zod schemas for request/response validation
  - Validate project exists via `getProjectById()`
  - Read spec file using `readFile(projectId, '.agent/specs/todo/{specFile}')`
  - Call `generateExecutionNames({ specContent })`
  - Return `{ data: { executionName, branchName } | null }`
  - File: `apps/web/src/server/routes/workflows.ts`
  - Error handling: 404 for missing project/spec, 500 for unexpected

#### Completion Notes

- Implemented `generateExecutionNames` AI service using Vercel AI SDK's `generateObject()` with Claude Sonnet 4.5
- Service returns structured output with `executionName` and `branchName` fields
- Silent fallback to `null` when ANTHROPIC_API_KEY not configured
- Spec content truncated to 2000 chars for token cost control
- Added POST `/api/workflows/generate-names-from-spec` endpoint with JWT auth
- Endpoint validates project exists, reads spec from `.agent/specs/todo/`, calls AI service
- Returns `{ data: { executionName, branchName } | null }`
- Proper error handling: 404 for missing project/spec, silent null return for missing API key

### Phase 2: Frontend - UI Refactor

**Phase Complexity**: 16 points (avg 5.2/10)

<!-- prettier-ignore -->
- [x] `ui-refactor-1` [7/10] Replace spec Tabs+Select with Combobox component
  - Remove `specMode` state ('file' | 'content')
  - Remove `specContent` state (string)
  - Remove `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` components
  - Remove `Select`, `SelectContent`, `SelectItem` for file mode
  - Remove `Textarea` for content mode
  - Add `Combobox` component (import from `@/client/components/ui/combobox`)
  - Transform spec files to options: `specFiles.map(file => ({ value: file, label: file }))`
  - Props: `value={specFile}`, `onValueChange={setSpecFile}`, `placeholder="Select spec file..."`
  - File: `apps/web/src/client/pages/projects/workflows/components/NewExecutionDialog.tsx`
  - Make full width (remove grid/column constraints)

- [x] `ui-refactor-2` [4/10] Reorder form layout (spec first, then name)
  - Move spec file selection section to top (before execution name)
  - Order: Spec → Name → Args → Git Mode
  - Update validation to check `specFile` instead of `specMode`/`specContent`
  - File: `apps/web/src/client/pages/projects/workflows/components/NewExecutionDialog.tsx`

- [x] `ui-refactor-3` [6/10] Add AI generation logic with useEffect
  - Add state: `const [isGeneratingNames, setIsGeneratingNames] = useState(false)`
  - Create useEffect that triggers on `specFile` change
  - Call `POST /api/workflows/generate-names-from-spec` with `{ projectId, specFile }`
  - Handle loading state with `setIsGeneratingNames(true/false)`
  - On success: populate `setName()`, `setBranchName()`, `setWorktreeName()`
  - On error or null response: silent (no error message)
  - File: `apps/web/src/client/pages/projects/workflows/components/NewExecutionDialog.tsx`
  - Dependencies: `[specFile, projectId]`

- [x] `ui-refactor-4` [4/10] Add loading spinner to name field
  - Show spinner icon during `isGeneratingNames` state
  - Add visual feedback that AI is working
  - Disable name field during generation (optional)
  - File: `apps/web/src/client/pages/projects/workflows/components/NewExecutionDialog.tsx`

- [x] `ui-refactor-5` [3/10] Update form reset logic
  - Remove `setSpecMode()` and `setSpecContent()` from reset handlers
  - Keep `setSpecFile('')` in reset
  - Ensure `isGeneratingNames` resets to false
  - File: `apps/web/src/client/pages/projects/workflows/components/NewExecutionDialog.tsx`

#### Completion Notes

- Removed `specMode` and `specContent` state - only using `specFile` now
- Replaced Tabs + Select with Combobox component for spec file selection
- Moved spec selection to top of form (before execution name)
- Added `isGeneratingNames` state for loading UI
- Implemented useEffect that auto-triggers AI generation when `specFile` changes
- API call to `/api/workflows/generate-names-from-spec` with silent error handling
- Populates `name`, `branchName`, and `worktreeName` with AI results
- Added loading spinner to name field with "Generating names from spec..." message
- Disabled name field during generation to prevent confusion
- Updated form reset logic to clear `isGeneratingNames` state
- Removed unused imports: Tabs, TabsContent, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea
- All fields remain editable after AI generation completes

### Phase 3: Testing & Validation

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] `test-1` [3/10] Manual testing - Happy path with API key
  - Set ANTHROPIC_API_KEY in `.env`
  - Restart dev server
  - Open New Execution Dialog
  - Select spec file from dropdown
  - Verify AI generates execution name and branch name
  - Verify fields are editable after generation
  - Verify execution creates successfully with generated names

- [ ] `test-2` [4/10] Manual testing - No API key graceful fallback
  - Remove ANTHROPIC_API_KEY from `.env` (or comment out)
  - Restart dev server
  - Open New Execution Dialog
  - Select spec file from dropdown
  - Verify NO loading spinner appears
  - Verify name fields remain empty (no error shown)
  - Verify user can manually enter names
  - Verify execution creates successfully with manual names

- [ ] `test-3` [3/10] Manual testing - Error scenarios
  - Test with invalid spec file (404 error)
  - Test with empty spec file content
  - Test with very long spec file (>10KB)
  - Verify no crashes, silent failures, fields stay editable
  - Check browser console for errors (should be none)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new unit tests required for this feature (AI service has nondeterministic output, endpoint is integration-tested via manual testing).

### Integration Tests

Manual integration testing covers the full flow:
1. User selects spec file
2. Backend reads file + calls AI
3. Frontend receives and displays results
4. User edits/confirms and creates execution

### E2E Tests

Not applicable (would require mocking AI responses, manual testing is sufficient for this feature).

## Success Criteria

- [ ] AI service returns structured names when API key configured
- [ ] AI service returns null when no API key (no errors thrown)
- [ ] POST endpoint reads spec file and calls AI service
- [ ] POST endpoint returns 404 for missing project/spec
- [ ] Frontend Combobox replaces Tabs+Select for spec selection
- [ ] Spec selection auto-triggers AI generation
- [ ] Loading spinner shows during AI generation
- [ ] Generated names populate execution name and branch name fields
- [ ] All fields remain editable after AI generation
- [ ] Silent fallback when API key missing (no error shown)
- [ ] Form reset clears all fields including spec selection
- [ ] Execution creation works with AI-generated names
- [ ] Execution creation works with manually-entered names

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web
pnpm build
# Expected: Clean build with no errors

# Type checking
pnpm tsc --noEmit
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors (or only existing warnings)
```

**Manual Verification:**

1. **With API key configured**:
   ```bash
   # Ensure .env has ANTHROPIC_API_KEY
   echo "ANTHROPIC_API_KEY=sk-..." >> apps/web/.env
   cd apps/web
   pnpm dev
   ```
   - Navigate to: `http://localhost:5173`
   - Login, go to project, click "New Execution"
   - Select spec file from Combobox dropdown
   - Verify: Loading spinner appears in name field
   - Verify: Execution name and branch name auto-populate
   - Verify: Names are descriptive and match spec content
   - Verify: Can edit names before submitting
   - Verify: Execution creates successfully

2. **Without API key**:
   ```bash
   # Comment out ANTHROPIC_API_KEY in .env
   cd apps/web
   pnpm dev
   ```
   - Same steps as above
   - Verify: NO loading spinner
   - Verify: Name fields stay empty (no error toast)
   - Verify: Can manually enter names
   - Verify: Execution creates successfully

3. **Error scenarios**:
   - Test with non-existent spec file (should fail gracefully)
   - Test with empty spec file (should handle gracefully)
   - Test network errors (disconnect, then try generation)
   - Verify: No crashes, user can still proceed manually

**Feature-Specific Checks:**

- Combobox search works (filter spec files by typing)
- Spec selection appears at top of form (before name)
- Branch/worktree names update based on git mode selection
- Form validation still works (required fields)
- Dialog reset clears all fields including spec selection

## Implementation Notes

### 1. API Key Handling

The feature gracefully degrades when `ANTHROPIC_API_KEY` is not configured:
- Backend service returns `null` (no throw)
- Frontend skips API call if first attempt returns `null` (optimization opportunity for future)
- User experience: empty fields, manual entry required
- No error messages or warnings shown to user

### 2. Token Cost Control

Spec files can be large (5-20KB). To control costs:
- Truncate to first 2000 chars before sending to AI
- Assumption: spec goals/overview are near the top
- Tradeoff: May miss details for very large specs

### 3. Structured Output Benefits

Using `generateObject()` vs `generateText()`:
- Type-safe output with Zod validation
- No parsing errors (AI returns structured JSON)
- Consistent field names and formats
- Better for integration with TypeScript frontend

## Dependencies

- Existing: `ai` (Vercel AI SDK) - already in package.json
- Existing: `@ai-sdk/anthropic` - already in package.json
- Existing: `zod` - already in package.json
- No new dependencies required

## References

- Vercel AI SDK docs: https://sdk.vercel.ai/docs
- `generateObject()` docs: https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object
- Existing example: `apps/web/src/server/domain/session/services/generateSessionName.ts`
- Existing example: `apps/web/src/server/domain/git/services/generateCommitMessage.ts`

## Next Steps

1. Complete Phase 1 tasks (backend service and endpoint)
2. Complete Phase 2 tasks (frontend UI refactor)
3. Complete Phase 3 tasks (testing and validation)
4. Consider future enhancements:
   - Cache AI results to avoid redundant calls
   - Add "regenerate" button for users to try again
   - Support custom prompts/templates for name generation
   - Add telemetry to track AI generation success rate
