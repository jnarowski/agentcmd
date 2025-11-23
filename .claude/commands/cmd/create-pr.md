---
description: Commit changes, push branch, and create pull request with AI-generated summary
argument-hint: [title?]
---

# Create Pull Request

Commits all changes, pushes the current branch to remote, and creates a GitHub pull request with an AI-generated description. Automatically analyzes git diff to generate PR title and body if not provided.

## Variables

- $title: $1 - PR title and commit message (optional - AI generates from git diff if not provided)

## Instructions

- Analyze git changes to understand what was modified, added, or removed
- Generate concise, conventional commit-style title if not provided (e.g., "feat: add user auth", "fix: resolve memory leak")
- Generate PR body summarizing key changes, files affected, and purpose
- Commit message uses the title (provided or generated)
- Always push to remote before creating PR
- PR always targets `main` branch as base
- Return structured JSON response with PR URL and metadata

## Workflow

1. **Analyze Changes**
   - Run `git status` to see all changes (staged and unstaged)
   - Run `git diff HEAD` to see all modifications
   - Run `git branch --show-current` to get current branch name
   - Understand what files changed and why

2. **Generate Title (if not provided)**
   - If $title not provided, analyze diff and generate conventional commit title
   - Format: `type: brief description` (e.g., "feat: implement user settings", "fix: handle null pointer")
   - Types: feat, fix, docs, refactor, test, chore
   - Keep under 72 characters

3. **Generate PR Body**
   - Summarize changes in 2-4 bullet points
   - Focus on what changed and why
   - Include key files or components affected
   - Keep concise and actionable

4. **Commit and Push**
   - Run `git add -A` to stage all changes
   - Check if there are changes to commit with `git status --porcelain`
   - If changes exist: Run `git commit -m "$title"` using title from step 2
   - If no changes: Skip commit (already committed previously)
   - Capture commit SHA from `git rev-parse HEAD`
   - Run `git push -u origin <branch-name>` (works even if already pushed)
   - Only fail if git commands return errors (not if nothing to commit)

5. **Create PR with GitHub CLI**
   - Use heredoc to handle multiline body:
     ```bash
     gh pr create --title "$title" --body "$(cat <<'EOF'
     $body
     EOF
     )" --base main
     ```
   - Capture the PR URL from gh output
   - gh will create the PR via GitHub API and return the real PR URL

6. **Return JSON Response**
   - Must return valid JSON matching schema below
   - Include all required fields
   - Set success: false if any step failed

## JSON Response Template

Return this exact structure:

<json_output>
{
  "success": true,
  "pr_url": "https://github.com/owner/repo/pull/123",
  "commit_sha": "abc123def456...",
  "branch_name": "feature-branch",
  "title": "feat: implement user authentication",
  "body": "- Added login/logout endpoints\n- Implemented JWT token validation\n- Created user session management\n\nKey files: server/auth.ts, client/Login.tsx",
  "message": "Pull request created successfully"
}
</json_output>

**JSON Field Descriptions:**

- `success`: Boolean - true if PR created successfully, false if failed
- `pr_url`: String - GitHub pull request URL (e.g., "https://github.com/owner/repo/pull/123") or empty string if failed
- `commit_sha`: String - Git commit SHA (7+ chars) or empty string if failed
- `branch_name`: String - Current git branch name
- `title`: String - PR title and commit message (conventional commit format) or empty string if failed
- `body`: String - PR description summarizing changes or empty string if failed
- `message`: String - Human-readable success/error message

## Common Pitfalls

- Don't fail if no changes to commit - skip commit step and proceed to push + PR
- Don't fail if branch already pushed (git push may show "everything up-to-date")
- Don't generate vague titles like "update files" - be specific about what changed
- Don't include git command output in JSON - only structured data
- Only return success: false if git/gh commands fail (auth errors, network issues, etc.)
- Ensure gh CLI is installed and authenticated (`gh auth status`)
- Extract PR URL from gh output (look for "https://github.com/.../pull/\d+")

## Report

Return ONLY the JSON response, no other text. The JSON must be valid and parseable.
