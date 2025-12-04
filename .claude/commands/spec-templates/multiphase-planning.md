# Multiphase Planning Template

Three-phase exploration and planning process: Explore -> Clarify -> Document.

## Process Overview

### Phase 0: Exploratory Analysis (SILENT)

Before any user interaction, silently:

1. **Extract Keywords** from the feature description
2. **Search Codebase** for related patterns:
   - Glob for related files by keyword
   - Look for similar implementations
   - Identify existing patterns to follow
3. **Gather Context** about architecture and conventions
4. **Prepare Questions** based on findings

### Phase 1: Requirements Clarification

Ask context-aware clarifying questions:

1. **Work Type**: Feature / Bug / Chore / Task / Refactor
2. **Complexity Level**:
   - Low (1-2 files, simple changes)
   - Medium (3-5 files, moderate complexity)
   - High (6+ files, significant changes)
3. **Affected Layers** (multiselect):
   - UI / Components
   - State Management
   - API / Services
   - Database / Models
   - Infrastructure
4. **Platform Requirements** (if applicable)
5. **Type-Specific Questions**:
   - Features: User story, acceptance criteria, dependencies
   - Bugs: Reproduction, severity, impact scope
   - Chores: Scope, breaking changes, motivation

### Phase 2: PRD Creation

Generate comprehensive PRD with:

## PRD Template Structure

```md
# [Product/Feature Name] PRD

**Date:** [Current Date]
**Version:** 1.0
**Status:** draft

## Overview

[2-3 sentences: Core value proposition and goals]

## Problem Statement

- **Problem:** [What specific problem are we solving?]
- **Why now:** [Why does this problem matter now?]
- **Cost of inaction:** [What happens if we don't solve it?]

## Objectives & Success Metrics

**Primary Objective:** [One main goal]

**Key Metrics:**
- [Metric 1 with target]
- [Metric 2 with target]

## Users

**Primary Persona:** [Who needs this]
- **Job to be done:** [Core task]
- **Current frustrations:** [Pain points]

## Solution Requirements

| Requirement | Priority | User Story | Acceptance Criteria |
|-------------|----------|------------|---------------------|
| [Feature]   | P0       | As a [user], I want [capability] so that [benefit] | [Criteria] |
| [Feature]   | P1       | ... | ... |

**Priority Levels:**
- P0 (Must Have) - MVP blockers
- P1 (Should Have) - Important
- P2 (Could Have) - Nice to have
- P3 (Won't Have) - Future

## Technical Approach

### Architecture

- **Pattern:** [Monolith/Microservice/etc]
- **Key Components:** [List main components]
- **Integration Points:** [External systems]

### High-Level Design

[Describe approach without implementation details]

### Technical Decisions

- **Stack:** [Technology choices]
- **Database:** [If applicable]
- **Dependencies:** [Key dependencies]

## Constraints & Assumptions

**Constraints:**
- [Technical limitations]
- [Resource limitations]

**Assumptions:**
- [Key assumption 1]
- [Key assumption 2]

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] |

## Out of Scope

- [What's NOT included]
- [Future considerations]

## Definition of Done

- [ ] [Launch criteria 1]
- [ ] [Launch criteria 2]
- [ ] [Quality gates]

## Next Steps

1. [First step after PRD approval]
2. [Second step]
3. Use `/cmd:add-spec [id]` to create implementation spec
```

## Usage

Best for:
- New features requiring exploration
- Complex requirements needing clarification
- Projects where scope is unclear
- Multi-stakeholder features

The 3-phase approach ensures:
1. Context-aware questions (not generic)
2. User buy-in on requirements
3. Clear documentation before implementation
