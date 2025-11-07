---
description: Run validation command from README and fix all issues and warnings
argument-hint: []
---

# Fix

Runs all validation commands found in readme, and automatically fixes all issues including warnings. Iterates until validation passes with no errors or warnings.

## Workflow

1. **Read README.md**

   - Locate the `## Validation` section (search for exact header text)
   - Extract the command shown in the code block under this section
   - If no command is found, report error and stop

2. **Run Initial Validation**

   - Execute the validation command using the Bash tool
   - Capture the full output including errors, warnings, and info messages
   - Parse the output to identify all issues that need fixing

3. **Create Fix Plan**

   - Use TodoWrite to create a todo list with all issues found
   - Group similar issues together (e.g., "Fix 5 type errors", "Fix 3 lint warnings")
   - Mark the first issue as in_progress

4. **Fix Issues Automatically**

   - Fix all issues without prompting for confirmation, even if they aren't related to code you wrote
   - For each issue or group of issues:
     - Analyze the root cause
     - Apply the fix using appropriate tools (Edit, Write, Bash)
     - Mark the todo as completed
     - Mark the next todo as in_progress
   - Common fix patterns:
     - **Type errors**: Add type annotations, fix incorrect types, update interfaces. For TypeScript issues that cannot be fixed, use `@ts-ignore` comments only as a last resort
     - **Lint warnings**: Format code, remove unused imports, fix style issues
     - **Test failures**: Update test expectations, fix broken logic, mock missing dependencies
     - **Build errors**: Fix import paths, resolve missing dependencies, update configs

5. **Verify Fixes**

   - Re-run the validation command
   - Check if all issues are resolved
   - If new issues appeared, add them to the todo list and continue fixing
   - Repeat until validation command exits with success (exit code 0)

6. **Report Results**
   - Report the total number of issues fixed
   - Show the final validation output
   - List any remaining issues that could not be auto-fixed (if any)

## Report

After completion, report:

1. The validation command that was executed
2. Number of issues found initially
3. Summary of fixes applied (grouped by category)
4. Final validation status (pass/fail)
5. Full output of the final validation run
