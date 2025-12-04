# Multiphase Execution Template

Comprehensive implementation spec with phased execution and AI handoff prompts.

## Template Structure

```md
# [Feature Name]

**Status**: draft
**Created**: [YYYY-MM-DD]
**Package**: [package/app name]
**Total Complexity**: [X] points
**Phases**: [N]
**Tasks**: [N]
**Overall Avg Complexity**: [X.X]/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: [Name] | [N] | [X] | [X.X]/10 | [X]/10 |
| Phase 2: [Name] | [N] | [X] | [X.X]/10 | [X]/10 |
| Phase 3: [Name] | [N] | [X] | [X.X]/10 | [X]/10 |
| **Total** | **[N]** | **[X]** | **[X.X]/10** | **[X]/10** |

## Overview

[2-3 sentences describing what this feature does and why it's valuable]

## User Story

As a [user type]
I want to [action/goal]
So that [benefit/value]

## Technical Approach

[Brief description of implementation strategy and key design decisions]

## Key Design Decisions

1. **[Decision 1]**: [Rationale]
2. **[Decision 2]**: [Rationale]
3. **[Decision 3]**: [Rationale]

## Architecture

### File Structure

```
[Show relevant file/directory structure]
```

### Integration Points

**[Subsystem 1]**:
- `[file.ts]` - [what changes]

**[Subsystem 2]**:
- `[file.ts]` - [what changes]

---

## Phase 1: [Data Layer / Foundation]

**Phase Complexity**: [X] points (avg [X.X]/10)

### Tasks

- [ ] 1.1 [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation details]
- [ ] 1.2 [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation details]

### AI Handoff Prompt

```
Implement Phase 1 for [feature]: [Phase Name].

Context:
- Reference: .agent/specs/todo/[id]-[feature]/spec.md Phase 1
- Key files: [list specific paths]

Tasks:
1. [Task 1.1 description]
2. [Task 1.2 description]

Success criteria:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

Validate with: [validation command]
```

### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

---

## Phase 2: [Business Logic / Services]

**Phase Complexity**: [X] points (avg [X.X]/10)

### Tasks

- [ ] 2.1 [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation details]
- [ ] 2.2 [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation details]

### AI Handoff Prompt

```
Implement Phase 2 for [feature]: [Phase Name].

Prerequisites:
- Phase 1 must be complete
- [Any other prerequisites]

Context:
- Reference: .agent/specs/todo/[id]-[feature]/spec.md Phase 2
- Key files: [list specific paths]

Tasks:
1. [Task 2.1 description]
2. [Task 2.2 description]

Success criteria:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

Validate with: [validation command]
```

### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

---

## Phase 3: [UI / Presentation]

**Phase Complexity**: [X] points (avg [X.X]/10)

### Tasks

- [ ] 3.1 [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation details]
- [ ] 3.2 [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation details]

### AI Handoff Prompt

```
Implement Phase 3 for [feature]: [Phase Name].

Prerequisites:
- Phase 1 and 2 must be complete
- [Any other prerequisites]

Context:
- Reference: .agent/specs/todo/[id]-[feature]/spec.md Phase 3
- Key files: [list specific paths]

Tasks:
1. [Task 3.1 description]
2. [Task 3.2 description]

Success criteria:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

Validate with: [validation command]
```

### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

---

## Phase 4: [Testing & Validation]

**Phase Complexity**: [X] points (avg [X.X]/10)

### Tasks

- [ ] 4.1 [X/10] Write unit tests
  - File: `[test filepath]`
  - Cover: [key scenarios]
- [ ] 4.2 [X/10] Write integration tests
  - File: `[test filepath]`
  - Cover: [key flows]
- [ ] 4.3 [X/10] Manual validation
  - Steps: [verification steps]

### AI Handoff Prompt

```
Implement Phase 4 for [feature]: Testing & Validation.

Prerequisites:
- All implementation phases complete

Context:
- Reference: .agent/specs/todo/[id]-[feature]/spec.md Phase 4
- Implementation files: [list paths]

Tasks:
1. Write unit tests covering [scenarios]
2. Write integration tests for [flows]
3. Run full validation suite

Success criteria:
- [ ] All tests pass
- [ ] Coverage meets threshold
- [ ] Manual verification complete

Validate with:
- pnpm test
- pnpm check
- [manual steps]
```

### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

---

## Files Summary

### New Files ([count])

1. `[filepath]` - [purpose]
2. `[filepath]` - [purpose]

### Modified Files ([count])

1. `[filepath]` - [what changes]
2. `[filepath]` - [what changes]

## Validation Commands

```bash
# Build
[build command]

# Type check
[type check command]

# Lint
[lint command]

# Tests
[test command]
```

## Success Criteria

- [ ] [Functional requirement 1]
- [ ] [Functional requirement 2]
- [ ] All tests pass
- [ ] No type errors
- [ ] No lint errors
- [ ] Documentation updated

## Dependencies

- [Dependency 1]
- [Dependency 2]
- No new dependencies required (if true)

## References

- [Link to PRD if exists]
- [Link to related docs]
- [Link to similar implementations]
```

## Usage

Best for:
- Large features with multiple phases
- Features that can be parallelized
- Features requiring clear handoff points
- Team collaboration on complex work

Phase suggestions:
1. **Data Layer**: Models, schemas, migrations, repositories
2. **Business Logic**: Services, utilities, API endpoints
3. **Presentation**: Components, pages, state management
4. **Integration**: External services, webhooks, sync
5. **Testing**: Unit, integration, E2E tests
6. **Documentation**: API docs, user guides

Each phase includes AI handoff prompts for seamless execution.
