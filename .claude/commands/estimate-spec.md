---
description: Add complexity estimates to existing spec file
argument-hint: [spec-id-or-path-or-name]
---

# Estimate Spec Complexity

Analyze an existing spec file and add/update complexity estimates for all tasks and phases.

## Variables

- $specIdentifier: $1 (required) - One of:
  - Spec ID (e.g., `ef3`)
  - Full path (e.g., `.agent/specs/todo/ef3-auth-improvements-spec.md`)
  - Feature name (e.g., `auth-improvements`)

## Instructions

- **IMPORTANT**: Use your reasoning model - THINK HARD about task complexity based on context needs
- Locate the spec file from the provided identifier
- Read and parse the existing spec (supports markdown and json formats)
- Analyze each task and assign complexity score (1-10) based on context requirements
- Calculate phase totals and average complexity
- Update the spec file with complexity data while preserving all existing content
- Can be run multiple times to re-estimate if complexity scores already exist
- **DO NOT include hour-based estimates** - use complexity points only

## Complexity Scale (Context-Focused)

Assign complexity based on **context window usage and cognitive load**, not time:

- **1-2/10**: Trivial - Single file, <50 lines changed, minimal context (config, doc, simple type)
- **3-4/10**: Simple - Few files, straightforward logic, low context (single endpoint, basic component)
- **5-6/10**: Moderate - Multiple related files, moderate context (DB field + migration + API update)
- **7-8/10**: Complex - Cross-cutting change, high context, multiple domains (full-stack feature, state refactor)
- **9-10/10**: Very complex - Architectural change, deep codebase knowledge required (major refactor, complex integration)

**Key principle**: Higher complexity = more context the agent needs to load and understand

## Workflow

1. **Locate Spec File**:
   - If $specIdentifier is a full path (contains `/`):
     - Use that path directly
   - Otherwise, look up in `.agent/specs/index.json`:
     - For numeric ID: Match by `id` field
     - For feature name: Fuzzy match folder name (e.g., `message-queue` matches `ef3-message-queue-implementation/spec.md`)
     - Use path from index: `.agent/specs/{path}`
   - **If not found in index.json, fallback to directory search:**
     - Search in order: `.agent/specs/backlog/`, `.agent/specs/todo/`, `.agent/specs/done/`
     - For ID: Pattern `{id}-*/spec.{md,json}`
     - For feature name: Pattern `*{feature-name}*/spec.{md,json}` (fuzzy match)
   - If still not found, report error

2. **Read and Parse Spec**:
   - Detect format (markdown or json) from file extension
   - Parse the spec structure
   - Extract all tasks from all phases/task groups
   - Preserve all existing content for later merge

3. **Analyze and Estimate**:
   - For each task:
     - Read task description and implementation details
     - Consider file paths, commands, and scope
     - Assign complexity score (1-10) based on context needs
   - Calculate phase metrics:
     - Total points per phase (sum of task complexities)
     - Average complexity per phase
     - Max task complexity per phase
   - Calculate overall metrics:
     - Total complexity points
     - Overall average complexity
     - Total task count
     - Total phase count

4. **Update Spec**:
   - Add complexity metadata to header
   - Insert/update "Complexity Breakdown" table
   - Add complexity scores to each task: `[X/10]`
   - Add phase complexity summaries: `**Phase Complexity**: X points (avg X.X/10)`
   - Preserve all other content unchanged
   - Write updated spec back to original file

5. **Update Index**:
   - Read `.agent/specs/index.json`
   - Extract spec ID from path
   - Update spec entry with complexity fields:
     - `totalComplexity`: Total complexity points (number)
     - `phaseCount`: Number of phases (number)
     - `taskCount`: Number of tasks (number)
   - Update `updated` timestamp to current time
   - Write updated index back to file

6. **Report Results**:
   - Show file path
   - Display complexity summary
   - List phase breakdowns
   - Suggest next steps

## Complexity Breakdown Table Format

Insert this table after the metadata section and before "Overview":

```markdown
## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: [Name] | [N] | [X] | [X.X]/10 | [X]/10 |
| Phase 2: [Name] | [N] | [X] | [X.X]/10 | [X]/10 |
| **Total** | **[N]** | **[X]** | **[X.X]/10** | **[X]/10** |
```

## Task Complexity Format

Update each task to include complexity score:

**Before:**
```markdown
- [ ] task-1 Create authentication middleware
```

**After:**
```markdown
- [ ] task-1 [7/10] Create authentication middleware
```

## Phase Complexity Summary Format

Add phase complexity summary before tasks in each phase:

```markdown
### Phase 1: Authentication Setup

**Phase Complexity**: 18 points (avg 6.0/10)

- [ ] task-1-1 [6/10] Create auth middleware
- [ ] task-1-2 [6/10] Add JWT validation
- [ ] task-1-3 [6/10] Update route guards
```

## Metadata Updates

Add these fields to the spec metadata section:

**Markdown:**
```markdown
**Total Complexity**: [X] points
**Phases**: [N]
**Tasks**: [N]
**Overall Avg Complexity**: [X.X]/10
```

**JSON:**
```json
{
  "complexity": {
    "total": "[X]",
    "phases": "[N]",
    "tasks": "[N]",
    "overallAvg": "[X.X]"
  }
}
```

## Examples

**Example 1: Estimate by spec ID**
```bash
/estimate-spec ef3
```
Finds spec with ID ef3, analyzes tasks, adds complexity scores

**Example 2: Estimate by feature name**
```bash
/estimate-spec auth-improvements
```
Finds spec with "auth-improvements" in filename, adds complexity

**Example 3: Estimate by full path**
```bash
/estimate-spec .agent/specs/todo/ef3-auth-improvements-spec.md
```
Directly estimates the specified file

**Example 4: Re-estimate existing complexity**
```bash
/estimate-spec ef3
```
If complexity already exists, re-analyzes and updates scores

## Edge Cases

- **Spec not found**: Report error with search details
- **Invalid format**: Report error if spec is malformed
- **Complexity already exists**: Update existing scores (don't duplicate)
- **Multiple matches**: If feature name matches multiple specs, list them and ask user to clarify
- **JSON format**: Update JSON structure appropriately, maintaining schema

## Common Pitfalls

- **Don't add hours**: Only use complexity points (1-10 per task)
- **Preserve content**: Don't remove or modify existing task descriptions
- **Accurate calculations**: Ensure phase totals and averages are correct
- **Consistent format**: Use `[X/10]` for task complexity, `X points` for totals
- **Update both locations**: Add complexity to both task line and phase summary

## Report Format

After updating the spec, provide this summary:

```text
✓ Added complexity estimates to: .agent/specs/todo/[id]-[feature]-spec.md

## Complexity Summary
Total: [X] points (avg [X.X]/10)
Phases: [N]
Tasks: [N]

## Phase Breakdown
- Phase 1: [Name] - [X] pts (avg [X.X]/10)
- Phase 2: [Name] - [X] pts (avg [X.X]/10)
- Phase 3: [Name] - [X] pts (avg [X.X]/10)

Next: Review spec and decide on single vs multi-agent implementation
```

## Integration with Decision-Making

The complexity data added by this command is designed for consumption by a separate LLM call that will:
- Parse the complexity breakdown table
- Analyze phase independence and dependencies
- Determine optimal agent count and assignment strategy
- Recommend single agent, multi-agent, or spec splitting

The spec format is optimized for LLM parsing while remaining human-readable.
