---
allowed-tools: Bash(gh pr:*), Bash(git:*)
description: Create commit, push changes, and create PR if needed
argument-hint: [base-branch]
---

# Commit and Push

Analyze changes, create a commit with auto-generated message following team conventions, push to remote, and create a pull request if one doesn't exist. Fails gracefully if there are no changes to commit.

## Variables

- $base-branch: $1 (optional) - The base branch for the PR (defaults to `main`)

## Instructions

- NEVER run additional commands to read or explore code beyond git commands
- NEVER use the TodoWrite or Task tools
- Follow the exact git commit conventions from the codebase (include Claude footer)
- If there are no changes (no untracked files, no modifications), stop gracefully and inform the user
- NEVER skip git hooks or use --no-verify
- If commit fails due to pre-commit hook, report the error and stop - do not retry
- Use HEREDOC for commit messages to ensure proper formatting
- Always check if PR already exists before creating a new one
- Default to `main` as base branch if $base-branch is not provided

## Workflow

1. **Check for changes and analyze**
   - Run these commands in parallel: `git status`, `git diff`, and `git log -3 --oneline`
   - `git status`: See all untracked files and modifications
   - `git diff`: See staged and unstaged changes
   - `git log -3 --oneline`: Understand commit message style
   - If no changes exist, stop and inform user - DO NOT proceed

2. **Create commit**
   - Draft a concise commit message (1-2 sentences) based on the changes
   - Summarize the nature of changes (new feature, enhancement, bug fix, refactoring, test, docs, etc.)
   - Add all relevant changes: `git add -A`
   - Create commit with message ending with:
     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     ```
   - Use HEREDOC format:
     ```bash
     git commit -m "$(cat <<'EOF'
     Your commit message here.

     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     EOF
     )"
     ```
   - Run `git status` after commit to verify success

3. **Push to remote**
   - Get current branch name: `git branch --show-current`
   - Check if branch has upstream: `git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "no-upstream"`
   - If no upstream, push with `-u` flag: `git push -u origin <branch-name>`
   - Otherwise, push normally: `git push`

4. **Create PR if needed**
   - Determine target base branch: use $base-branch if provided, otherwise use `main`
   - Check if PR exists: `gh pr view --json url 2>/dev/null`
   - If PR doesn't exist, create one:
     - Analyze ALL commits and changes from divergence point:
       - `git log <base-branch>..HEAD` - See commit history
       - `git diff <base-branch>...HEAD` - See full diff of changes
     - Draft PR title and summary based on all commits and changes
     - Create PR: `gh pr create --base <base-branch> --title "..." --body "$(cat <<'EOF' ... EOF)"`
     - Use this body format:
       ```
       ## Summary
       <bullet points of key changes>

       ## Test plan
       - [ ] <testing checklist items>

       🤖 Generated with [Claude Code](https://claude.com/claude-code)
       ```
   - If PR exists, report the existing PR URL

## Examples

```bash
# Use default main branch
/commit-and-push

# Specify custom base branch
/commit-and-push develop
```

## Common Pitfalls

- Don't create commits when there are no changes - check first
- Don't forget to use HEREDOC for multi-line commit messages
- Don't create duplicate PRs - always check if one exists first
- Don't forget to include the Claude footer in both commit and PR

## Report

- If no changes: "No changes to commit. Working directory is clean."
- If successful: Report commit hash, push status, and PR URL (new or existing)
- If errors occur: Report the specific error and suggest next steps
