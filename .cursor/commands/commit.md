# Commit Changes

Create a git commit with staged changes following team conventions.

## Instructions

1. Review the current git status and staged changes
2. Analyze the diff to understand what has changed
3. Create a commit message that:
   - Uses conventional commit format (feat:, fix:, docs:, refactor:, test:, chore:)
   - Summarizes the changes clearly and concisely
   - Focuses on the "why" rather than just the "what"
4. Commit the changes with the formatted message
5. Confirm the commit was successful

## Commit Message Format

```
<type>: <subject>

<optional body>

<optional footer>
```

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build

## Example

```
feat: add user authentication

Implement JWT-based authentication system with login and logout endpoints.
Added middleware for protected routes.

Closes #123
```
