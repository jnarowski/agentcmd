# Simple Spec Template

Single-phase specification for straightforward features, bugs, or tasks.

## Template Structure

```md
# [Feature/Bug/Task Name]

**Status**: draft
**Created**: [YYYY-MM-DD]
**Type**: [feature | bug | task | chore]
**Complexity**: [low | medium | high]

## Overview

[2-3 sentences describing what this is and why it's needed]

## Problem Statement

[What specific problem are we solving?]

## Solution

[Brief description of how we'll solve it]

## Requirements

### Functional Requirements

- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

### Non-Functional Requirements

- [ ] [Performance, security, or other constraints]

## Implementation Tasks

**Total Complexity**: [X] points

- [ ] 1. [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation notes]
- [ ] 2. [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation notes]
- [ ] 3. [X/10] [Task description]
  - File: `[filepath]`
  - [Implementation notes]

## Files to Modify

### New Files

1. `[filepath]` - [purpose]

### Modified Files

1. `[filepath]` - [what changes]

## Testing

- [ ] Unit tests for [component]
- [ ] Integration test for [flow]
- [ ] Manual verification: [steps]

## Validation Commands

```bash
# Build
[build command]

# Type check
[type check command]

# Test
[test command]
```

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Notes

[Any additional context, edge cases, or considerations]
```

## Usage

Best for:
- Single-phase implementations
- Bug fixes
- Small features
- Configuration changes
- Documentation updates

Complexity scale (1-10):
- 1-2: Trivial (<50 lines, single file)
- 3-4: Simple (few files, straightforward)
- 5-6: Moderate (multiple files, some complexity)
- 7-8: Complex (cross-cutting, multiple domains)
- 9-10: Very complex (architectural changes)
