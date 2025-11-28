---
description: Implement changes from PR feedback, reply to threads, auto-resolve
argument-hint: [pr-number?]
allowed-tools: Bash(gh:*), Bash(git:*)
---

# Implement PR Feedback

Atomic operation: fetch PR comments → analyze → implement → commit → reply to each thread → auto-resolve.

## Variables

- $pr-number: $1 (optional) - PR number (defaults to current branch PR)

## Instructions

CRITICAL:
- NEVER skip git hooks (no --no-verify)
- Use HEREDOC for commit message with Claude footer
- Check if changes exist before committing
- Reply to EACH comment thread individually BEFORE resolving
- Skip resolve gracefully if permission denied
- Don't implement outdated comments without user confirmation
- NEVER run additional commands beyond git/gh operations
- NEVER use TodoWrite or Task tools

## Workflow

### 1. Detect PR Number and Repo Info

Run these commands in parallel:

```bash
# Get PR number if not provided
gh pr view --json number -q .number

# Get repo owner and name for GraphQL API
gh repo view --json owner,name -q '"\(.owner.login)/\(.name)"'
```

If no PR found and $pr-number not provided, stop with error: "No PR found for current branch. Please provide PR number."

### 2. Fetch PR Comments and Reviews

```bash
gh pr view $PR_NUMBER --json reviews,reviewThreads
```

This returns JSON with:
- `reviews`: Array of review objects with `state` (APPROVED, CHANGES_REQUESTED, COMMENTED), `body`, `author`
- `reviewThreads`: Array of thread objects with `isResolved`, `isOutdated`, `comments` (array with `body`, `path`, `line`, `id`, `author`)

### 3. Parse and Display Structured Analysis

Parse the JSON to extract actionable comments. Filter and classify:

**Filter criteria (actionable comments):**
- `isResolved === false`
- `isOutdated === false`
- NOT just approval/LGTM comments

**Priority classification (based on keywords in comment body):**
- **High**: Review state is `CHANGES_REQUESTED`, or body contains "must", "required", "blocking", "needs", "have to"
- **Medium**: Body contains "should", "consider", "suggest", "recommend", "could you", "please"
- **Low**: Body contains "?", "why", "how come", "curious"

Display structured analysis like this:

```
## PR Feedback Analysis

**PR #123**: 12 total comments, 5 unresolved threads

### High Priority (3 comments)
- [src/file.ts:45] @reviewer: Must fix validation logic here
- [src/app.ts:102] @reviewer: Required: handle null edge case

### Medium Priority (2 comments)
- [src/utils.ts:23] @reviewer: Consider adding error handling

### Low Priority / Questions (1 comment)
- [README.md] @reviewer: Why did we choose this approach?

---
**Actionable items to implement**: 5 comments
```

### 4. Implement Changes

For each actionable comment, in priority order (high → medium → low):

1. Read the file mentioned in the comment using the Read tool
2. Understand the requested change from the comment body
3. Apply the change using the Edit tool
4. Verify syntax and logic correctness
5. Track which comment threads were addressed (save comment IDs and thread IDs)

**Important:**
- If implementation is uncertain or feedback conflicts, STOP and ask the user for guidance
- If comment is outdated (refers to deleted lines), confirm with user before skipping
- For code suggestions in markdown (` ```code``` `), extract and apply directly
- Track the mapping of: `comment_id → thread_id → file_path`

### 5. Commit Changes with HEREDOC

After all changes implemented:

```bash
# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit."
  exit 0
fi

# Stage all changes
git add .

# Create commit with HEREDOC (note the single quotes to prevent interpolation)
git commit -m "$(cat <<'EOF'
fix: address PR feedback (#$PR_NUMBER)

Implemented changes from code review:
- [Brief 1-2 line summary of main changes made]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Get the commit SHA for replies
COMMIT_SHA=$(git rev-parse --short HEAD)
```

### 6. Reply to Each Comment Thread

For EACH addressed comment, post an individual reply:

```bash
# Post reply to specific comment (this adds to the thread)
gh pr comment $PR_NUMBER --body "✅ Addressed in commit $COMMIT_SHA"
```

**Important:** You must reply to each comment thread separately, not post a single PR-level comment. Use the comment in the context of the file/line discussion.

### 7. Resolve Each Thread

For each addressed thread, resolve it via GraphQL API:

```bash
# Get thread ID from the reviewThreads data
# Resolve the thread
gh api graphql -f query="
mutation {
  resolveReviewThread(input: {threadId: \"$THREAD_ID\"}) {
    thread {
      id
      isResolved
    }
  }
}
"
```

**Error handling:**
- If you get a 403 error (permission denied), skip resolving that thread and continue
- Don't fail the entire operation if some threads can't be resolved
- Track which threads were resolved vs. skipped

### 8. Push Changes

```bash
git push
```

If push fails with "no upstream branch", use:
```bash
git push -u origin $(git branch --show-current)
```

## Common Pitfalls

- Don't commit if no changes exist (check `git status --porcelain` first)
- Don't implement outdated comments without confirming with user
- Don't fail operation if resolve is permission denied (skip gracefully)
- Don't forget HEREDOC single quotes `'EOF'` to prevent variable interpolation in commit message
- Don't auto-resolve threads if you weren't confident about the implementation
- Don't post a single summary comment - reply to EACH thread individually
- Don't use `gh pr comment` for threaded replies - it posts PR-level comments, but that's what we want in this case

## Report

After completion, provide a summary:

```
## PR Feedback Implementation Complete

✅ **Addressed**: 5 of 7 comments
📝 **Files modified**: src/file.ts, src/app.ts, src/utils.ts
📌 **Commit**: abc123d
💬 **Threads replied to**: 5
✔️  **Threads resolved**: 4 (1 skipped - permission denied)
❓ **Remaining unresolved**: 2 (low priority questions for reviewer)

Successfully pushed changes to remote.
```

If there were no actionable comments:
```
## PR Feedback Review Complete

ℹ️  All comments are either resolved, outdated, or non-actionable.
No changes needed at this time.
```
