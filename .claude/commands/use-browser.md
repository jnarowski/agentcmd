---
description: Login to app and verify feature works, iterating until successful
argument-hint: [featureSteps]
---

# Use Browser to Verify Feature

Automates browser testing to verify a feature is working correctly in the application. Logs into the app using test credentials, validates the feature, and iterates on fixes until successful.

## Variables

- $featureSteps: $1 (required) - Description of the feature to verify (e.g., "user can create new projects", "dashboard displays metrics correctly")
- $testUrl: fetch TEST_URL from env
- $testUsername: fetch TEST_USERNAME from env
- $testPassword: fetch TEST_PASSWORD from env

## Instructions

- ALWAYS use Playwright MCP tools for browser automation
- Log in using credentials from environment variables TEST_USERNAME and TEST_PASSWORD
- Login URL: $testUrl
- Test the feature thoroughly based on the description provided
- If issues are found, fix them and re-test
- DO NOT finish until the feature is verified as working
- Take screenshots of failures to help with debugging
- Report all issues found and fixes applied

## Workflow

1. **Authenticate**
   - Navigate to $testUrl from environment
   - Fill in username field with $testUsername from environment
   - Fill in password field with $testPassword from environment
   - Submit the login form
   - Verify successful login (check for redirect or dashboard)

2. **Test the Feature**
   - Navigate to the relevant page/section for the feature
   - Perform the actions described in $featureSteps
   - Capture any errors, unexpected behavior, or visual issues
   - Take screenshots if verification fails

3. **Iterate on Issues**
   - If issues found:
     a. Document the specific problem
     b. Identify the root cause (use code search, read relevant files)
     c. Implement fixes to the codebase
     d. Return to step 1 (re-authenticate and re-test)
   - Repeat until feature works correctly

4. **Final Verification**
   - Run one complete end-to-end test of the feature
   - Verify no console errors or warnings
   - Confirm expected behavior matches requirements
   - Document the successful test result

## Testing Guidelines

- **Be thorough**: Test edge cases, not just happy paths
- **Check UI**: Verify visual elements render correctly
- **Check functionality**: Ensure interactions work as expected
- **Check data**: Validate that data is displayed/saved correctly
- **Check errors**: Look for console errors or network failures
- **Check responsiveness**: Test key user flows completely

## Common Scenarios

### Example 1: Testing a new form

```zsh
/use-browser user can submit the contact form with validation
```

### Example 2: Testing data display

```zsh
/use-browser dashboard shows project metrics and charts
```

### Example 3: Testing navigation

```zsh
/use-browser user can navigate to project detail page from list
```

## Report

After successful verification, provide:

- Summary of what was tested
- Number of issues found and fixed (if any)
- Final status (PASS/FAIL)
- Screenshots or evidence of working feature
- Any remaining concerns or follow-up items

IMPORTANT: Do NOT mark the task as complete until you have successfully verified the feature is working through browser automation.
