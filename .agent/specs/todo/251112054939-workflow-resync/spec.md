# Workflow Resync Without Server Restart

**Status**: draft
**Created**: 2025-11-12
**Package**: apps/app
**Total Complexity**: 42 points
**Phases**: 4
**Tasks**: 14
**Overall Avg Complexity**: 6.0/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Core Infrastructure | 4 | 24 | 6.0/10 | 8/10 |
| Phase 2: API Endpoint | 3 | 10 | 3.3/10 | 5/10 |
| Phase 3: UI Improvements | 2 | 5 | 2.5/10 | 3/10 |
| Phase 4: Testing & Validation | 5 | 3 | 0.6/10 | 1/10 |
| **Total** | **14** | **42** | **6.0/10** | **8/10** |

## Overview

Enable workflow definition reloading without restarting the development server by replacing Inngest's `fastifyPlugin` with a direct `serve()` call wrapped in a mutable route handler. When workflows are updated on disk, developers can trigger a resync via API endpoint that rescans files, updates the database, and reloads Inngest functions. The Inngest dev server automatically picks up changes on its next poll.

## User Story

As a workflow developer
I want to reload workflow definitions without restarting the server
So that I can iterate quickly on workflow development without losing application state or waiting for full server restarts

## Technical Approach

Replace Inngest's `fastifyPlugin` (which is just a thin wrapper) with direct use of the `serve()` function wrapped in a route handler. Store the handler reference in a module-level variable that can be mutated. Create a rescan helper that:
1. Scans global and project workflow files
2. Uses module cache busting (`import(url + '?v=' + Date.now())`)
3. Updates database records (create, update, archive, set errors)
4. Returns new function array and detailed diff

Expose `fastify.reloadWorkflowEngine()` decorator that calls the rescan helper and swaps the handler. Add POST endpoint that triggers reload and returns detailed results.

## Key Design Decisions

1. **Use `serve()` directly instead of `fastifyPlugin`**: Inngest's plugin is just a 22-line wrapper around `serve()`. Using `serve()` directly gives us control to swap handlers while keeping all functionality (request parsing, response handling, error handling). Official docs show this pattern: https://github.com/inngest/inngest-js/blob/main/packages/inngest/src/fastify.ts#L17-L36

2. **Module-level mutable handler reference**: Store `currentHandler` at module level so the wrapper route can delegate to it. Swapping the reference atomically updates what the Inngest dev server sees on next poll. In-flight executions complete safely with old definitions.

3. **Database updates during resync**: Update WorkflowDefinition records to track state (new, updated, archived). Use existing `load_error` field for import failures. This keeps UI in sync and provides audit trail.

4. **Per-workflow error handling**: Wrap each workflow import in try/catch. Skip errored workflows but continue loading others. Store error messages in `load_error` field so UI can display them. Valid workflows still register with Inngest.

5. **Module cache busting via query params**: Node.js caches `import()` results by URL. Adding `?v=${Date.now()}` forces fresh import on each resync without complex cache invalidation.

## Architecture

### File Structure
```
apps/app/src/server/
├── domain/workflow/services/engine/
│   ├── initializeWorkflowEngine.ts          # Modified: use serve() + expose reload
│   ├── rescanAndLoadWorkflows.ts            # New: rescan helper
│   ├── loadProjectWorkflows.ts              # Modified: add cache busting
│   ├── loadGlobalWorkflows.ts               # Modified: add cache busting
│   └── ...
├── routes/
│   └── workflow-definitions.ts              # Modified: add resync endpoint
└── ...

apps/app/src/client/pages/projects/workflows/components/
└── WorkflowDefinitionRow.tsx                # Modified: add error tooltip
```

### Integration Points

**Workflow Engine**:
- `initializeWorkflowEngine.ts` - Replace plugin registration, expose reload function
- `rescanAndLoadWorkflows.ts` - New helper extracting rescan logic
- `loadProjectWorkflows.ts` - Add cache busting to imports
- `loadGlobalWorkflows.ts` - Add cache busting to imports

**API Routes**:
- `workflow-definitions.ts` - Add POST /api/workflow-definitions/resync endpoint

**UI Components**:
- `WorkflowDefinitionRow.tsx` - Add tooltip showing full error message

## Implementation Details

### 1. Replace fastifyPlugin with serve() + Wrapper

Current implementation uses `fastifyPlugin` which internally calls `serve()` and registers a route. We'll use `serve()` directly with a wrapper route that delegates to a mutable handler reference.

**Key Points**:
- Import `serve` from `inngest/fastify` (already exported)
- Store handler in module-level `let currentHandler`
- Route handler delegates: `(req, reply) => currentHandler(req, reply)`
- Inngest dev server polls endpoint and gets updated configs

### 2. Rescan Helper Function

Extract workflow loading logic from `initializeWorkflowEngine` into reusable `rescanAndLoadWorkflows` helper that:
- Scans global and project workflow directories
- Compares with database to identify new/updated/archived
- Dynamically imports with cache busting
- Handles per-workflow errors
- Updates database records
- Returns functions array and detailed diff

**Key Points**:
- Reuses existing scan functions (scanGlobalWorkflows, scanAllProjectWorkflows)
- Updates DB: create new, mark archived if missing, set load_error on failure
- Cache busting: `pathToFileURL(file).href + '?v=' + Date.now()`
- Returns: `{ functions: InngestFunction[], diff: { new, updated, archived, errors } }`

### 3. Fastify Decorator for Reload

Expose `fastify.reloadWorkflowEngine()` decorator that:
- Calls rescanAndLoadWorkflows helper
- Swaps `currentHandler` with new serve() instance
- Returns diff details for API response

**Key Points**:
- Atomic handler swap (single assignment)
- In-flight executions complete with old handler
- New requests use new handler immediately

### 4. API Endpoint

Add POST endpoint at `/api/workflow-definitions/resync` that:
- Requires JWT authentication
- Calls `fastify.reloadWorkflowEngine()`
- Returns detailed diff with summary and per-workflow details

**Key Points**:
- Consistent with existing workflow-definitions routes
- Returns actionable information for UI
- Includes error details for debugging

### 5. UI Error Display

Improve WorkflowDefinitionRow to show full error message in tooltip:
- Use shadcn Tooltip component
- Show on hover over "Error" badge
- Truncate long messages with max width

**Key Points**:
- Error badge already exists (line 27-32)
- Add Tooltip wrapper around badge
- Display `definition.load_error` in TooltipContent

## Files to Create/Modify

### New Files (1)

1. `apps/app/src/server/domain/workflow/services/engine/rescanAndLoadWorkflows.ts` - Rescan helper function

### Modified Files (5)

1. `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts` - Replace plugin, expose reload
2. `apps/app/src/server/domain/workflow/services/engine/loadProjectWorkflows.ts` - Add cache busting
3. `apps/app/src/server/domain/workflow/services/engine/loadGlobalWorkflows.ts` - Add cache busting
4. `apps/app/src/server/routes/workflow-definitions.ts` - Add resync endpoint
5. `apps/app/src/client/pages/projects/workflows/components/WorkflowDefinitionRow.tsx` - Add error tooltip

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Core Infrastructure

**Phase Complexity**: 24 points (avg 6.0/10)

<!-- prettier-ignore -->
- [ ] 1.1 [8/10] Replace fastifyPlugin with serve() wrapper in initializeWorkflowEngine.ts
  - Import `serve` from `inngest/fastify` instead of `fastifyPlugin`
  - Add module-level variable: `let currentHandler: ReturnType<typeof serve>`
  - Create handler: `currentHandler = serve({ client: inngestClient, functions: inngestFunctions })`
  - Replace `fastify.register(fastifyPlugin, ...)` with `fastify.route({ method: ["GET", "POST", "PUT"], url: config.workflow.servePath, handler: async (req, reply) => currentHandler(req, reply) })`
  - Add code comment referencing official pattern: `// See: https://github.com/inngest/inngest-js/blob/main/packages/inngest/src/fastify.ts#L17-L36`
  - File: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts`
  - High complexity due to replacing core integration pattern and ensuring no functional regression

- [ ] 1.2 [7/10] Create rescanAndLoadWorkflows helper function
  - Create new file with function signature: `async function rescanAndLoadWorkflows(fastify, inngestClient, logger)`
  - Call scanGlobalWorkflows and scanAllProjectWorkflows
  - Fetch current WorkflowDefinition records from DB
  - Load workflows using loadGlobalWorkflows and loadProjectWorkflows (with cache busting)
  - Handle per-workflow errors with try/catch, set load_error field
  - Update DB: prisma.workflowDefinition.upsert for new/updated, update with file_exists: false for archived
  - Build diff object: `{ new: [], updated: [], archived: [], errors: [] }`
  - Return: `{ functions: inngestFunctions, diff }`
  - File: `apps/app/src/server/domain/workflow/services/engine/rescanAndLoadWorkflows.ts`
  - High complexity due to coordinating multiple subsystems (scan, load, DB, error handling)

- [ ] 1.3 [5/10] Add cache busting to loadProjectWorkflows
  - Find dynamic import line: `const module = await import(fileUrl)`
  - Change to: `const fileUrl = pathToFileURL(file).href + '?v=' + Date.now(); const module = await import(fileUrl);`
  - Add comment explaining cache busting
  - File: `apps/app/src/server/domain/workflow/services/engine/loadProjectWorkflows.ts`
  - Moderate complexity due to understanding module loading behavior

- [ ] 1.4 [4/10] Add cache busting to loadGlobalWorkflows
  - Find dynamic import line: `const module = await import(fileUrl)`
  - Change to: `const fileUrl = pathToFileURL(file).href + '?v=' + Date.now(); const module = await import(fileUrl);`
  - Add comment explaining cache busting
  - File: `apps/app/src/server/domain/workflow/services/engine/loadGlobalWorkflows.ts`
  - Moderate complexity due to understanding module loading behavior

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: API Endpoint

**Phase Complexity**: 10 points (avg 3.3/10)

<!-- prettier-ignore -->
- [ ] 2.1 [5/10] Expose reloadWorkflowEngine decorator on fastify instance
  - After route registration in initializeWorkflowEngine, add: `fastify.decorate('reloadWorkflowEngine', async () => { ... })`
  - Inside decorator: call `const { functions, diff } = await rescanAndLoadWorkflows(fastify, inngestClient, logger)`
  - Swap handler: `currentHandler = serve({ client: inngestClient, functions })`
  - Log reload event with counts
  - Return diff object
  - File: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts`
  - Moderate complexity due to coordinating reload logic and handler swap

- [ ] 2.2 [3/10] Add POST /api/workflow-definitions/resync endpoint
  - Add route after existing workflow-definitions routes
  - Method: POST, Path: `/api/workflow-definitions/resync`
  - Auth: `preHandler: fastify.authenticate`
  - Handler: call `const diff = await fastify.reloadWorkflowEngine()`
  - Return: `{ success: true, summary: { total, new, updated, archived, errors }, workflows: diff }`
  - Add Zod schema for response validation (optional)
  - File: `apps/app/src/server/routes/workflow-definitions.ts`
  - Low-moderate complexity, straightforward endpoint

- [ ] 2.3 [2/10] Add TypeScript type augmentation for reloadWorkflowEngine decorator
  - Add declaration: `declare module 'fastify' { interface FastifyInstance { reloadWorkflowEngine(): Promise<ResyncDiff> } }`
  - Define ResyncDiff type
  - File: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts` or separate types file
  - Low complexity, type definition only

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: UI Improvements

**Phase Complexity**: 5 points (avg 2.5/10)

<!-- prettier-ignore -->
- [ ] 3.1 [3/10] Add tooltip to error badge in WorkflowDefinitionRow
  - Import Tooltip components: `import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/client/components/ui/tooltip"`
  - Wrap existing error badge (lines 27-32) with Tooltip components
  - Add TooltipContent with definition.load_error text
  - Style with max-width and word-wrap for long messages
  - File: `apps/app/src/client/pages/projects/workflows/components/WorkflowDefinitionRow.tsx`
  - Low-moderate complexity, UI component change

- [ ] 3.2 [2/10] Ensure WorkflowDefinition type includes load_error field
  - Check `apps/app/src/client/pages/projects/workflows/types.ts`
  - Add `load_error: string | null` to WorkflowDefinition interface if missing
  - File: `apps/app/src/client/pages/projects/workflows/types.ts`
  - Low complexity, type definition

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Testing & Validation

**Phase Complexity**: 3 points (avg 0.6/10)

<!-- prettier-ignore -->
- [ ] 4.1 [1/10] Test successful workflow resync
  - Start dev server: `pnpm dev`
  - Modify a workflow file in `.agent/workflows/definitions/`
  - Call: `curl -X POST http://localhost:3456/api/workflow-definitions/resync -H "Authorization: Bearer $TOKEN"`
  - Verify: Response shows updated workflow in diff
  - Verify: Inngest dev UI shows updated function configs
  - Manual verification

- [ ] 4.2 [1/10] Test workflow with syntax error
  - Add syntax error to a workflow file
  - Call resync endpoint
  - Verify: Response includes error in `workflows.errors` array
  - Verify: Database has load_error set for that workflow
  - Verify: UI shows error badge with tooltip containing error message
  - Manual verification

- [ ] 4.3 [1/10] Test workflow file deletion
  - Delete a workflow file
  - Call resync endpoint
  - Verify: Response shows workflow in `workflows.archived` array
  - Verify: Database has file_exists: false
  - Manual verification

- [ ] 4.4 [0/10] Test new workflow creation
  - Create new workflow file
  - Call resync endpoint
  - Verify: Response shows workflow in `workflows.new` array
  - Verify: Database has new WorkflowDefinition record
  - Verify: Inngest dev UI shows new function
  - Manual verification

- [ ] 4.5 [0/10] Test in-flight execution safety
  - Start a long-running workflow execution
  - While running, modify workflow and resync
  - Verify: In-flight execution completes with old definition
  - Verify: New executions use updated definition
  - Manual verification

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`apps/app/src/server/domain/workflow/services/engine/rescanAndLoadWorkflows.test.ts`** - Test rescan logic:

```typescript
describe('rescanAndLoadWorkflows', () => {
  it('should identify new workflows', async () => {
    // Test that new files are detected and added to diff
  });

  it('should identify updated workflows', async () => {
    // Test that changed files are detected
  });

  it('should mark missing workflows as archived', async () => {
    // Test that deleted files result in archived status
  });

  it('should handle workflow import errors gracefully', async () => {
    // Test that syntax errors are caught and stored in load_error
  });

  it('should clear load_error on successful load', async () => {
    // Test that previously errored workflows clear error on fix
  });
});
```

### Integration Tests

**Test workflow engine initialization and reload:**
- Initialize engine with test workflows
- Trigger reload with modified workflows
- Verify handler swap occurs
- Verify database updates are correct
- Verify diff object is accurate

### E2E Tests

**`apps/app/src/client/pages/projects/workflows/__tests__/workflow-resync.e2e.test.ts`** - Test full resync flow:

```typescript
test('workflow resync updates UI', async ({ page }) => {
  // 1. Navigate to workflows page
  // 2. Note existing workflows
  // 3. Modify workflow file on disk
  // 4. Trigger resync via API or UI button (if added)
  // 5. Verify UI updates to show changed workflow
  // 6. Verify error badge appears for errored workflow
  // 7. Hover over error badge and verify tooltip shows error message
});
```

## Success Criteria

- [ ] Workflows can be reloaded without server restart via API endpoint
- [ ] Inngest dev server picks up updated function configs automatically
- [ ] Database WorkflowDefinition records stay in sync (new, updated, archived)
- [ ] Workflow import errors are captured in load_error field
- [ ] UI displays error badge with tooltip showing full error message
- [ ] In-flight workflow executions complete safely with old definitions
- [ ] New executions use updated definitions after resync
- [ ] Cache busting ensures Node.js re-imports modified files
- [ ] Module-level handler reference enables atomic handler swap
- [ ] No functional regressions from replacing fastifyPlugin
- [ ] Type safety maintained with proper TypeScript types
- [ ] All automated tests pass
- [ ] Manual verification scenarios pass

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Successful build with no errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Open Inngest dev UI: `http://localhost:8288`
3. Note current workflow functions listed
4. Modify a workflow file in `.agent/workflows/definitions/example-basic-workflow.ts` (change name or add step)
5. Get JWT token from authenticated session
6. Call resync endpoint:
   ```bash
   curl -X POST http://localhost:3456/api/workflow-definitions/resync \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json"
   ```
7. Verify response shows updated workflow in diff
8. Refresh Inngest dev UI and verify function configs updated
9. Navigate to workflows page in UI
10. Verify workflow list shows updated workflow
11. Add syntax error to workflow file and resync
12. Verify UI shows error badge
13. Hover over error badge and verify tooltip displays error message

**Feature-Specific Checks:**

- Verify `serve()` function is used instead of `fastifyPlugin`
- Verify `/api/workflows/inngest` endpoint still responds correctly
- Verify GET request to inngest endpoint returns function configs
- Verify POST request can execute workflow steps
- Verify multiple resyncs work correctly
- Verify no memory leaks from handler references
- Verify database transactions complete correctly
- Check server logs for successful reload events

## Implementation Notes

### 1. Inngest Handler Lifecycle

The `serve()` function returns a request handler that's stateless - it reads from the functions array captured at creation time. Swapping the handler reference is safe because:
- GET/PUT requests (registration) read function configs from new handler
- POST requests (execution) use function IDs to look up in captured array
- In-flight executions keep reference to old handler until complete
- No shared mutable state between handlers

### 2. Module Cache Busting Strategy

Node.js ESM loader caches modules by URL. Adding query parameters creates a unique URL that bypasses the cache:
```typescript
// Without cache busting: same module returned from cache
await import('/path/to/workflow.ts')
await import('/path/to/workflow.ts') // <- cached

// With cache busting: fresh import each time
await import('/path/to/workflow.ts?v=1234')
await import('/path/to/workflow.ts?v=5678') // <- fresh
```

This is simpler and more reliable than `delete require.cache[...]` which doesn't work with ESM.

### 3. Database Consistency

The rescan helper maintains consistency between filesystem and database:
- **New files**: Create WorkflowDefinition record, status "active"
- **Updated files**: Update WorkflowDefinition record, clear load_error
- **Deleted files**: Set file_exists: false (keep for audit trail)
- **Import errors**: Set load_error message, keep record active

This ensures UI always has data to display and errors are visible.

### 4. Error Handling Strategy

Per-workflow error handling prevents one bad workflow from blocking others:
```typescript
for (const file of workflowFiles) {
  try {
    const workflow = await loadWorkflow(file);
    functions.push(workflow);
  } catch (error) {
    errors.push({ file, error: error.message });
    await prisma.workflowDefinition.update({
      where: { path: file },
      data: { load_error: error.message }
    });
  }
}
```

Valid workflows still load and register with Inngest.

### 5. Atomic Handler Swap

The handler swap is a single assignment which is atomic in JavaScript:
```typescript
currentHandler = serve({ client, functions }); // Atomic
```

No race conditions or partial state. Requests mid-flight complete with whichever handler they captured.

## Dependencies

- No new npm packages required
- Uses existing `serve` export from `inngest/fastify` package
- Uses existing shadcn/ui Tooltip component
- Relies on Node.js ESM loader behavior for cache busting

## References

- **Inngest serve() official docs**: https://github.com/inngest/inngest-js/blob/main/packages/inngest/src/fastify.ts#L17-L36
- **Inngest fastifyPlugin source**: `/Users/jnarowski/Dev/sourceborn/src/agentcmd/apps/app/node_modules/inngest/fastify.js`
- **WorkflowDefinition schema**: `apps/app/prisma/schema.prisma` (lines 11-41)
- **Existing workflow loading logic**: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts`

## Next Steps

1. Review this spec for completeness and accuracy
2. Begin Phase 1 implementation with task 1.1 (replace fastifyPlugin)
3. Test handler swap with simple workflow modification
4. Implement rescan helper with full error handling
5. Add API endpoint and test via curl
6. Improve UI error display
7. Run full validation suite
8. Deploy to development environment
9. Monitor for issues during workflow development
10. Consider adding UI button for resync (future enhancement)
