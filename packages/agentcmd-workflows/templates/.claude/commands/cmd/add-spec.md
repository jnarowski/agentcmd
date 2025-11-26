---
description: Add implementation spec to existing PRD folder
argument-hint: [specId]
---

# Add Spec to Existing Folder

Adds an implementation spec (feature/bug/issue) to an existing spec folder that contains a PRD. Routes to the appropriate generate command with context.

## Variables

- $param1: $1 (required) - 10-digit spec ID of existing folder (e.g., `2511131522`)

## Instructions

- **IMPORTANT**: This is a ROUTER command - it does NOT generate specs itself
- **IMPORTANT**: Read the appropriate generate command instructions and follow them exactly
- This command adds a spec to a folder that already has a PRD (or empty folder)
- Auto-detects spec type from conversation context (feature/bug/issue)
- References existing PRD content if available for better accuracy
- Routes to: `generate-feature-spec`, `generate-bug-spec`, or `generate-issue-spec`

## Workflow

1. **Validate Spec ID**:
   - Verify $param1 is a 10-digit number matching format `YYMMDDHHmm`
   - If invalid format: Show error and exit
   - Example valid: `2511131522`
   - Example invalid: `123` (too short), `abc` (not numeric)

2. **Read Index and Verify Folder**:
   - Read `.agent/specs/index.json`
   - Look up entry with key matching $param1
   - If not found: Show error listing available spec IDs and exit
   - Extract folder path from entry
   - Verify folder exists at `.agent/specs/{folder}`
   - If folder doesn't exist: Show error and exit

3. **Check for Existing Spec**:
   - Check if entry has `path` field in index.json
   - If `path` field exists and points to `spec.md`: Show error "Spec already exists at {path}" and exit
   - This prevents overwriting existing specs

4. **Read Existing PRD (if present)**:
   - Check if `prd.md` exists in folder
   - If exists: Read `prd.md` content to use as additional context
   - If not: Continue without PRD context

5. **Detect Spec Type**:
   - Analyze conversation history and PRD content (if available)
   - Determine if this is a:
     - **feature**: New functionality, enhancement, or major change
     - **bug**: Fixing broken behavior, errors, or unexpected results
     - **issue**: Small task, minor fix, or simple change

   - If type is ambiguous: Ask user to clarify:
     ```md
     **Question**: What type of spec should I generate?
     **Suggestions**:
     1. feature - New functionality or major enhancement (recommended if building something new)
     2. bug - Fix broken behavior or error
     3. issue - Small task or minor change
     ```

6. **Gather Context**:
   - Combine conversation history + PRD content (if available)
   - This becomes the context for the generate command
   - **IMPORTANT**: If PRD exists, emphasize its requirements and objectives in the context

7. **Route to Generate Command**:
   - Based on detected/confirmed type:
     - If `feature`: Read and follow `.claude/commands/cmd/generate-feature-spec.md` instructions
     - If `bug`: Read and follow `.claude/commands/cmd/generate-bug-spec.md` instructions
     - If `issue`: Read and follow `.claude/commands/cmd/generate-issue-spec.md` instructions

   - **IMPORTANT**: Follow ALL instructions from the generate command exactly as written
   - **IMPORTANT**: Use the EXISTING spec ID ($param1), do NOT generate a new ID
   - **IMPORTANT**: Use the EXISTING folder, do NOT create a new folder
   - **IMPORTANT**: Update the EXISTING index.json entry by adding the `path` field

8. **Execute Generate Command Instructions**:
   - Follow the generate command workflow starting from the "Generate Spec" step
   - Skip the "Generate Spec ID" and "Generate Feature Name" steps (already have these)
   - Skip the "Write Spec Folder" step (folder already exists)
   - Write `spec.md` to existing folder
   - Update index.json entry by adding `path` field:

     **Before (PRD only):**
     ```json
     {
       "2511131522": {
         "folder": "2511131522-oauth-support",
         "spec_type": "prd",
         "status": "draft",
         "created": "2025-11-13T15:22:00Z",
         "updated": "2025-11-13T15:22:00Z"
       }
     }
     ```

     **After (PRD + Spec):**
     ```json
     {
       "2511131522": {
         "folder": "2511131522-oauth-support",
         "path": "todo/2511131522-oauth-support/spec.md",
         "spec_type": "feature",
         "status": "draft",
         "created": "2025-11-13T15:22:00Z",
         "updated": "2025-11-13T15:22:00Z"
       }
     }
     ```

   - Note: `spec_type` changes from "prd" to the spec type (feature/bug/issue)

## Examples

### Example 1: Add spec to PRD folder

```bash
/cmd:add-spec 2511131522
```

Reads existing folder `2511131522-oauth-support/`, detects type from conversation, generates spec in that folder.

### Example 2: Add spec to empty folder

```bash
/cmd:add-spec 2511131430
```

Folder exists but has no PRD or spec yet, generates spec based on conversation context.

## Common Pitfalls

- **Invalid spec ID**: Must be exactly 10 digits in YYMMDDHHmm format
- **Spec already exists**: Check for `path` field in index.json entry before proceeding
- **Folder not found**: Verify folder exists before attempting to write spec
- **Creating new folder**: NEVER create a new folder - only add to existing ones
- **Generating new ID**: NEVER generate a new ID - use the provided spec ID
- **Not reading PRD**: If prd.md exists, always read it for context
- **Type confusion**: Feature = new functionality, Bug = fix broken behavior, Issue = small task
- **Index not updated**: Must update existing entry by adding `path` field and changing `spec_type`

## Report

**IMPORTANT**: After completing all steps, output ONLY raw JSON using the format from the generate command you routed to.

Example outputs:

**Feature Spec:**
```json
{
  "success": true,
  "spec_folder": ".agent/specs/todo/2511131522-oauth-support",
  "spec_file": ".agent/specs/todo/2511131522-oauth-support/spec.md",
  "spec_id": "2511131522",
  "spec_type": "feature",
  "feature_name": "oauth-support",
  "complexity": {
    "total": "45",
    "avg": "5.6"
  },
  "files_to_create": ["apps/app/src/server/auth/oauth.ts"],
  "files_to_modify": ["apps/app/src/server/routes/auth.ts"],
  "next_command": "/cmd:implement-spec 2511131522"
}
```

**Bug Spec:**
```json
{
  "success": true,
  "spec_folder": ".agent/specs/todo/2511131422-memory-leak-fix",
  "spec_file": ".agent/specs/todo/2511131422-memory-leak-fix/spec.md",
  "spec_id": "2511131422",
  "spec_type": "bug",
  "bug_name": "memory-leak-fix",
  "complexity": {
    "total": "12",
    "avg": "4.0"
  },
  "files_to_create": [],
  "files_to_modify": ["apps/app/src/server/engine/cleanup.ts"],
  "next_command": "/cmd:implement-spec 2511131422"
}
```

**Issue Spec:**
```json
{
  "success": true,
  "spec_folder": ".agent/specs/todo/2511131345-export-button",
  "spec_file": ".agent/specs/todo/2511131345-export-button/spec.md",
  "spec_id": "2511131345",
  "spec_type": "issue",
  "issue_name": "export-button",
  "complexity": {
    "total": "8",
    "avg": "2.7"
  },
  "files_to_create": [],
  "files_to_modify": ["apps/app/src/client/components/ExportButton.tsx"],
  "next_command": "/cmd:implement-spec 2511131345"
}
```
