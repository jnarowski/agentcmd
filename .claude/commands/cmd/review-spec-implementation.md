---
description: Review implementation against spec and document findings for fixes
argument-hint: [specIdOrNameOrPath, format]
---

# Review Spec Implementation

Reviews a previous agent's implementation work by comparing the provided spec file against actual code changes. Identifies discrepancies and documents all findings in a Review Findings section appended to the spec. The documented issues can then be addressed by running `/cmd:implement-spec` on the updated spec file.

## Variables

- $specIdOrNameOrPath: $1 (required) - Either a timestamp ID (e.g., `251024120101`), feature name (e.g., `workflow-safety`), or full path
- $format: $2 (optional) - Output format: "text" or "json" (defaults to "text" if not provided)
- $max-reviews: 3 - This is a constant (maximum review iterations allowed)

## Spec File Resolution

**Parse and resolve $specIdOrNameOrPath:**
- If it's a full path (contains `/`): use as-is
- Otherwise, look up in `.agent/specs/index.json`:
  - For timestamp ID: Match by `id` field
  - For feature name: Fuzzy match path (e.g., `message-queue` matches `todo/251024120101-message-queue-implementation/spec.md`)
  - Use path from index: `.agent/specs/{path}`
- **If not found in index.json, fallback to directory search:**
  - Search in order: backlog/, todo/, done/
  - For ID: Pattern `{id}-*/spec.md`
  - For feature name: Pattern `*{feature-name}*/spec.md` (fuzzy match)
- If still not found: stop and report error

## Instructions

- **REVIEW ONLY** - This command does not implement fixes
- **Evidence-based** - Every finding must cite file:line and quote spec requirements
- **Priority-focused** - Only document HIGH and MEDIUM priority issues (see guidelines below)
- **Pragmatic mindset** - Ask "would this block a PR merge?" not "could this be better?"
- **Project standards** - Check `.agent/docs/code-review-standards.md` for detailed review methodology. If that file is missing, look for best practices in CLAUDE.MD
- **Maximum Iterations:** Reviews stop automatically after 3 iterations
- Act as a professional code auditor, not a nitpicking perfectionist
- If $format is not provided, default to "text"

## Review Scope & Severity Guidelines

Use these guidelines to determine what issues to document:

### HIGH Priority (Blocking - Must Fix)

- Broken functionality (syntax errors, undefined variables, obvious logic errors)
- Missing required features explicitly stated in spec
- Security vulnerabilities (exposed secrets, injection risks)
- Critical bugs (data corruption, crashes, infinite loops)
- Missing error handling that will cause crashes

### MEDIUM Priority (Should Fix)

- Significant code duplication (same logic in 3+ places)
- Missing tests for new features
- Pattern violations (not using project's logger, error handling, or path utilities)
- Complex functions (>50 lines or 3+ nesting levels)
- Unhandled edge cases (null checks, empty arrays)

### LOW Priority (Do NOT Document)

- Naming suggestions, style preferences, micro-optimizations
- Comments, variable ordering, theoretical refactors
- **Skip these entirely - they create noise**

## Review Methodology

**Evidence-Based Review:**

- Cite specific locations: `file.ts:123`
- Quote spec requirements: "Spec section 2.3 requires..."
- Check for justifying comments before flagging unusual patterns
- Distinguish obvious errors from code that needs manual testing

**Priority-First Approach:**

- Review HIGH priority issues first
- Then MEDIUM priority issues
- Stop when complete - don't search for problems

**False Positive Prevention:**

- Read surrounding context (comments, docs) before flagging
- Verify spec actually requires what you think it requires
- Check if deviation is intentional and documented

**Completion Criteria:**

- All spec requirements implemented
- No HIGH or MEDIUM priority issues
- Production-ready, not perfect

## Workflow

1. **Validate Inputs**

   - **Parse and resolve $specIdOrNameOrPath:**
     - If it's a full file path (contains `/`):
       - Use the path as-is
     - Otherwise, look up in `.agent/specs/index.json`:
       - For timestamp ID: Match by `id` field
       - For feature name: Fuzzy match path (e.g., `message-queue` matches `todo/251024120101-message-queue-implementation/spec.md`)
       - Use path from index: `.agent/specs/{path}`
     - **If not found in index.json, fallback to directory search:**
       - Search in order: `.agent/specs/backlog/`, `.agent/specs/todo/`, `.agent/specs/done/`
       - For ID: Pattern `{id}-*/spec.md`
       - For feature name: Pattern `*{feature-name}*/spec.md` (fuzzy match anywhere in folder name)
   - Verify spec file exists at resolved path (exit with error if not found)
   - Set `$specFilePath` to the resolved full path for use in subsequent steps
   - Determine main branch (main/master) using `git branch` or git config
   - **Auto-detect review iteration:**
     - Scan spec file for existing "Review Findings" sections
     - Count sections: "Review Findings" = 1, "Review Findings (#2)" = 2, etc.
     - Find highest iteration number (e.g., if #1, #2, #3 exist, highest is 3)
     - If no "Review Findings" sections exist, highest is 0
     - Set `$review-count = highest + 1`
   - **Check max iterations:**
     - If `$review-count > $max-reviews`: **EXIT IMMEDIATELY** with success status
     - Skip all remaining steps (2-5)
     - Return message: "Maximum review iterations (3) reached. No further automated reviews will be performed. Please manually review the most recent Review Findings section to determine if remaining issues need to be addressed."
   - If `$review-count <= $max-reviews`: Continue to step 2

2. **Gather Context**

   - Run `git diff [main-branch]...HEAD` to see all code changes
   - Run `git log [main-branch]...HEAD --oneline` to see commit history
   - Read spec file completely (`$specFilePath`)
   - Read `.agent/docs/code-review-standards.md` for detailed review methodology
   - Read CLAUDE.md or similar project docs for additional context (if exists)
   - **If $review-count > 1:**
     - Find and read the MOST RECENT `## Review Findings` section in the spec
     - This will be the section with the highest number (e.g., if #1, #2, #3 exist, read #3)
     - Note all previously identified issues to track which were fixed

3. **Perform Review**

   - **If $review-count > 1, verify previous findings were addressed:**
     - For each issue from the most recent Review Findings section:
       - Check if it was fixed in the code
       - If NOT fixed, carry it forward to new findings
       - If fixed, note it as resolved (don't re-document)
   - **For each spec phase/requirement:**
     - Verify it's implemented and working
     - Check acceptance criteria met
     - Apply HIGH/MEDIUM priority filters from guidelines above
   - **Check code quality** (if applicable to project):
     - Error handling patterns
     - Type safety
     - Code duplication
     - Edge cases
   - **Cite evidence**: Use `file.ts:123` format and quote spec requirements
   - **Check context**: Read comments before flagging unusual patterns

4. **Document Findings**

   - Append new `## Review Findings` section to spec file using template below
   - **Section naming:**
     - First review ($review-count = 1): `## Review Findings`
     - Subsequent reviews ($review-count > 1): `## Review Findings (#2)`, `## Review Findings (#3)`, etc.
   - This preserves the history of all review iterations in the same file
   - **Only include phases that have issues** - phases with zero issues should be mentioned in "Positive Findings" if notable
   - **Only include priority sections (HIGH/MEDIUM) when issues exist at that level** - don't create empty sections
   - **Add status indicators** for each phase: ✅ Complete, ⚠️ Incomplete, ❌ Not implemented
   - Group issues by phase first, then by priority within each phase
   - Include: file:line, quoted spec requirement, actual vs expected
   - **If no issues found at all:** Still add Review Findings section with "No issues found" message
   - **Update spec Status field:**
     - If issues found: Set Status to "review"
     - If no issues found: Set Status to "completed"
   - **Update index.json:**
     - Update the spec's `status` field to match spec.md (either "review" or "completed")
     - Update the spec's `updated` field to current timestamp
     - Write updated index back to `.agent/specs/index.json`

5. **Report Results**

   - Summary: iteration X of 3, files reviewed, issue counts by priority
   - Next step:
     - If issues found: `/implement-spec $specIdOrNameOrPath` then `/review-spec-implementation $specIdOrNameOrPath`
     - If no issues found: Implementation is complete

## Review Findings Template

Use this template when adding the Review Findings section to the spec file.

- For first review: use `## Review Findings`
- For subsequent reviews: use `## Review Findings (#2)`, `## Review Findings (#3)`, etc.
- **IMPORTANT**: Append to the end of the spec file, preserving all previous Review Findings sections
- Example of multiple iterations in same file:

```md
[... rest of spec ...]

## Review Findings

**Review Date:** 2025-01-15
**Reviewed By:** Claude Code
**Review Iteration:** 1 of $max-reviews
[... findings from first review ...]

## Review Findings (#2)

**Review Date:** 2025-01-15
**Reviewed By:** Claude Code
**Review Iteration:** 2 of $max-reviews
[... findings from second review ...]

## Review Findings (#3)

**Review Date:** 2025-01-16
**Reviewed By:** Claude Code
**Review Iteration:** 3 of $max-reviews
[... findings from third review ...]
```

### Template Structure

```md
## Review Findings [add (#$review-count) if $review-count > 1]

**Review Date:** [Today's date]
**Reviewed By:** Claude Code
**Review Iteration:** [review-count] of $max-reviews
**Branch:** [Current branch name]
**Commits Reviewed:** [Number of commits]

### Summary

[Brief 2-3 sentence summary of overall implementation quality and main findings]

### Phase 1: [Phase Name from Spec]

**Status:** [✅ Complete / ⚠️ Incomplete / ❌ Not implemented] - [brief status description]

#### HIGH Priority

- [ ] **[Specific issue title]**
  - **File:** `file-path:line-number`
  - **Spec Reference:** "Quote from spec requiring this"
  - **Expected:** [What the spec required]
  - **Actual:** [What was implemented]
  - **Fix:** [Brief description of what needs to be done]

#### MEDIUM Priority

- [ ] **[Specific issue title]**
  - **File:** `file-path:line-number`
  - **Spec Reference:** "Quote from spec requiring this"
  - **Expected:** [What the spec required]
  - **Actual:** [What was implemented]
  - **Fix:** [Brief description of what needs to be done]

### Phase 2: [Phase Name from Spec]

**Status:** [✅ Complete / ⚠️ Incomplete / ❌ Not implemented] - [brief status description]

[Continue with same structure - only include phases with issues, only include HIGH/MEDIUM sections if issues exist at that priority level]

### Positive Findings (Optional)

- Well-implemented error handling in `auth-service.ts`
- Comprehensive test coverage for payment module
- [Note patterns or implementations that were done particularly well]

### Review Completion Checklist

- [ ] All spec requirements reviewed
- [ ] Code quality checked
- [ ] All findings addressed and tested
```

### "No Issues Found" Template

If the review finds zero HIGH or MEDIUM priority issues, use this simplified template:

```md
## Review Findings [add (#$review-count) if $review-count > 1]

**Review Date:** [Today's date]
**Reviewed By:** Claude Code
**Review Iteration:** [review-count] of $max-reviews
**Branch:** [Current branch name]
**Commits Reviewed:** [Number of commits]

### Summary

✅ **Implementation is complete.** All spec requirements have been verified and implemented correctly. No HIGH or MEDIUM priority issues found.

### Verification Details

**Spec Compliance:**

- ✅ All phases implemented as specified
- ✅ All acceptance criteria met
- ✅ All validation commands pass

**Code Quality:**

- ✅ Error handling implemented correctly
- ✅ Type safety maintained
- ✅ No code duplication
- ✅ Edge cases handled

### Positive Findings

[List what was done well - this is especially important when no issues found]

- Well-structured implementation following project patterns
- Comprehensive error handling throughout
- Strong type safety with proper TypeScript usage
- Good test coverage
- [Other notable positive aspects]

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [x] All acceptance criteria met
- [x] Implementation ready for use
```

## Common Pitfalls

- Don't assume implementation is correct - verify everything against the spec
- Don't skip reading the entire spec - requirements may be scattered throughout
- Don't just look at the latest commit - review ALL changes in the branch
- Don't attempt to fix issues during review - document them thoroughly instead

## Report

### JSON

**IMPORTANT**: If $format is "json", return ONLY the JSON from the output tags below:

<json_output>
{
  "success": true,
  "review_iteration": 2,
  "max_iterations": 3,
  "max_iterations_reached": false,
  "spec_path": ".agent/specs/feature.md",
  "branch": "feat/feature-name",
  "commits_reviewed": 5,
  "issues_found": 5,
  "previous_issues_resolved": 3,
  "priority_breakdown": {
    "high": 2,
    "medium": 3
  },
  "categories": {
    "missing_implementations": 1,
    "incomplete_implementations": 2,
    "code_quality": 2
  }
}
</json_output>

**JSON Field Descriptions:**

- `success`: True if review passed, false if it failed
- `review_iteration`: Current iteration number (1-based, auto-detected)
- `max_iterations`: Always 3
- `max_iterations_reached`: True if review_iteration > 3
- `spec_path`: Path to spec file reviewed
- `branch`: Current git branch
- `commits_reviewed`: Number of commits since branching
- `issues_found`: Total issues in this review iteration
- `previous_issues_resolved`: Count of issues from previous review that were fixed (0 if first review)
- `priority_breakdown`: Counts by priority level
- `categories`: Counts by issue category

### Text

Otherwise, provide this human-readable information to the user:

1. **Review Summary:**

   - Review iteration: [current count] of $max-reviews
   - Spec file reviewed: [path]
   - Branch compared: [current] vs [main/master]
   - Number of commits reviewed: [count]
   - Total issues found: [count]

2. **Issue Breakdown by Category:**

   - HIGH Priority: [count]
   - MEDIUM Priority: [count]
   - By category:
     - Missing Implementations: [count]
     - Incomplete Implementations: [count]
     - Code Quality & Patterns: [count]
     - [Other categories with counts...]

3. **Updated Spec Location:**

   - Path: [path to spec file with Review Findings section]

4. **Next Steps:**

   If issues were found:

   ```bash
   # First, fix the issues
   /implement-spec $specIdOrNameOrPath

   # Then, review again (iteration will auto-increment)
   /review-spec-implementation $specIdOrNameOrPath
   ```

   If NO issues were found:

   ```text
   Implementation is complete! No issues found. The code is ready for use.
   ```
