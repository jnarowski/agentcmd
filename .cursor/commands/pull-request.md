---
allowed-tools: Bash(gh pr:*), Bash(git:*)
description: Create a pull request with proper commit and PR setup
argument-hint: [title, format]
---

# Pull Request

Follow the steps in Workflow to Create a pull request for the current branch.

## Variables

- $title: $1
- $format: $2 (optional) - Output format: "text" or "json" (defaults to "text" if not provided)

## Instructions

- Use conventional commit format for the commit message.
- If $format is not provided, default to "text"

## Workflow

1. Check current git status with `git status`
2. Review changes with `git diff`
3. Stage all changes with `git add -A`
4. Create a semantic commit with a descriptive message based on the changes
5. Push the current branch to origin
6. Create a pull request using `gh pr create` with:
   - Title: $ARGUMENTS (if provided) or generate from commit
   - Fill out the PR body with:
     - Summary of changes
     - Type of change (feature/fix/docs/refactor)
     - Testing performed
   - Set appropriate labels if possible

## Report

### JSON

**IMPORTANT**: If $format is "json", return raw JSON output (no ```json code fences, no markdown):

```json
{
  "success": true,
  "pr_url": "https://github.com/owner/repo/pull/123",
  "pr_number": 123,
  "pr_title": "feat: add user authentication",
  "branch": "feat/user-auth",
  "base_branch": "main",
  "commit_sha": "abc123def456",
  "commit_message": "feat: add user authentication\n\nImplements OAuth2 authentication with GitHub provider.",
  "files_changed": 8,
  "lines_added": 320,
  "lines_removed": 45,
  "labels": ["feature", "enhancement"],
  "draft": false
}
```

**JSON Field Descriptions:**

- `success`: Always true if PR creation completed
- `pr_url`: Full URL to the created pull request
- `pr_number`: Pull request number
- `pr_title`: Title of the pull request
- `branch`: Source branch name
- `base_branch`: Target/base branch name (usually main/master)
- `commit_sha`: SHA of the commit pushed
- `commit_message`: Full commit message including body
- `files_changed`: Number of files changed
- `lines_added`: Number of lines added
- `lines_removed`: Number of lines removed
- `labels`: Array of labels applied to the PR
- `draft`: Boolean indicating if PR is in draft mode

### Text

Otherwise, provide this human-readable information to the user:

Output the PR URL
