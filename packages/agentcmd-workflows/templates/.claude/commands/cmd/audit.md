---
description: Comprehensive codebase audit with scoring and prioritized refactoring plan
argument-hint: [mode?, scope?]
---

# Audit Codebase

Perform comprehensive codebase audit focused on developer experience and code quality. Analyzes architecture, clarity, types, duplication, errors, standards, structure, debt, dependencies, and tests. Optimized for small projects (not enterprise).

## Variables

- $mode: $1 (optional, default: cleanup) - Analysis depth: `cleanup` (critical+moderate only), `standard` (all severities), `deep` (comprehensive with parallel agents)
- $scope: $2 (optional, default: full) - Audit scope: `full`, `frontend`, `backend`, `workflow`, `types`, `tests`

## Instructions

- Focus on **small project best practices** - pragmatic over enterprise patterns
- Goal: improve developer experience and code maintainability
- Generate **actionable recommendations** with clear solutions
- Score each section with **points-based system** (X/100 total)
- Prioritize refactoring by **impact** (high/medium/low)
- Be **concise** - sacrifice grammar for brevity in findings
- Report **file paths with line numbers** for all issues found

## Workflow

1. **Validate arguments**
   - Set mode = "cleanup" if not provided
   - Set scope = "full" if not provided
   - Validate mode is one of: cleanup, standard, deep
   - Validate scope is one of: full, frontend, backend, workflow, types, tests

2. **Deploy audit agents based on mode**
   - **cleanup mode**: Deploy 3-5 targeted agents focusing on critical+moderate issues only
   - **standard mode**: Deploy 6-8 agents covering all severity levels
   - **deep mode**: Deploy all 10 parallel agents with ultrathink depth

3. **Filter agents by scope**
   - If scope = "frontend": only deploy agents 2, 3, 4, 7, 10
   - If scope = "backend": only deploy agents 1, 3, 4, 5, 7, 10
   - If scope = "workflow": focus agents on specified domain in apps/web/src/client/pages/projects/workflows and server/domain/workflow
   - If scope = "types": only deploy agent 3
   - If scope = "tests": only deploy agent 10
   - If scope = "full": deploy all relevant agents

4. **Synthesize results**
   - Aggregate findings from all agents
   - Calculate total score (sum of section scores)
   - Categorize issues by severity: critical, moderate, minor
   - Generate prioritized refactoring plan

5. **Report findings**
   - Present report using Synthesis Template below
   - Include only issues matching severity filter (cleanup mode excludes minor)

## Subagent Templates

### Agent 1: Architecture Analysis (12 points)

**Task**: Analyze architectural patterns and design decisions.

**Evaluate**:
- Domain-driven design adherence (check server/domain/* structure)
- Separation of concerns (routes thin? logic in domain services?)
- Layer boundaries (client/server/shared properly separated?)
- Pure functions in domain services (no classes in services/)
- One function per file rule in domain/*/services/
- Backend imports from domain/ not old services/

**Scoring Rubric** (12 points):
- 12: Excellent domain-driven structure, clear boundaries, pure functions
- 9: Good structure, minor violations (1-2 classes in services/)
- 6: Moderate issues (mixed patterns, some layer leaking)
- 3: Poor architecture (no clear structure, classes in services/)
- 0: Critical problems (no separation, everything coupled)

**Report**:
- Score: X/12
- Issues found with file:line references
- Recommended fixes

---

### Agent 2: Code Clarity/Indirection Analysis (12 points)

**Task**: Analyze code readability and abstraction levels.

**Evaluate**:
- Unnecessary abstraction layers (over-engineering?)
- Function/component complexity (too many params? deeply nested?)
- Clear naming (intent obvious from names?)
- Cognitive load (how hard to understand flow?)
- Call depth (how many hops to reach actual logic?)
- Magic numbers/strings without constants

**Scoring Rubric** (12 points):
- 12: Excellent clarity, minimal indirection, obvious intent
- 9: Good readability, minor complexity issues
- 6: Moderate confusion (some unclear abstractions)
- 3: Poor clarity (excessive indirection, unclear flow)
- 0: Incomprehensible (layers on layers, no clear path)

**Report**:
- Score: X/12
- Examples of unclear code with file:line
- Specific refactoring suggestions

---

### Agent 3: Type Safety Analysis (10 points)

**Task**: Analyze TypeScript usage and type coverage.

**Evaluate**:
- `any` usage (how prevalent? justified?)
- Type duplication (same types defined multiple places?)
- Strict mode compliance
- Missing type definitions
- Proper null vs undefined usage (DB fields: `| null`, UI props: `?`)
- Backend imports shared types from @/shared/schemas

**Scoring Rubric** (10 points):
- 10: Excellent type safety, minimal any, strict mode, shared types
- 7: Good types, few any uses, minor duplication
- 5: Moderate issues (scattered any, type duplication)
- 2: Poor types (pervasive any, inconsistent)
- 0: No type safety (any everywhere)

**Report**:
- Score: X/10
- Count of `any` usages with locations
- Type duplication instances
- Recommended consolidation

---

### Agent 4: Code Duplication Analysis (8 points)

**Task**: Identify duplicated logic and DRY violations.

**Evaluate**:
- Copy-pasted code blocks
- Similar logic in multiple places
- Repeated patterns that could be utilities
- Duplicate type definitions
- Same logic in components/services

**Scoring Rubric** (8 points):
- 8: Minimal duplication, good abstraction
- 6: Minor duplication (2-3 instances)
- 4: Moderate duplication (4-6 instances)
- 2: Significant duplication (7+ instances)
- 0: Pervasive copy-paste

**Report**:
- Score: X/8
- List of duplicated code with file:line pairs
- Suggested shared utilities to create

---

### Agent 5: Error Handling Analysis (10 points)

**Task**: Analyze error handling patterns and consistency.

**Evaluate**:
- Consistent error patterns (services return null? throw?)
- Proper error logging
- User-facing error messages (clear? actionable?)
- Error recovery mechanisms
- Try-catch usage (appropriate? swallowing errors?)
- Centralized error handling

**Scoring Rubric** (10 points):
- 10: Excellent consistency, proper logging, good UX
- 7: Good patterns, minor inconsistencies
- 5: Moderate issues (mixed patterns, some errors swallowed)
- 2: Poor handling (inconsistent, bad UX)
- 0: No error handling

**Report**:
- Score: X/10
- Inconsistent patterns found with examples
- Error handling gaps
- Recommended standardization

---

### Agent 6: Standards/Best Practices Analysis (12 points)

**Task**: Evaluate adherence to project conventions and best practices.

**Evaluate**:
- CLAUDE.md guidelines compliance
- Import patterns (no .js extensions? @/ aliases?)
- React hooks (proper dependency arrays? primitives only?)
- Zustand immutability (proper spreading?)
- Fastify response schemas defined
- PascalCase components, kebab-case for shadcn/ui only
- Co-located tests

**Scoring Rubric** (12 points):
- 12: Excellent adherence to all guidelines
- 9: Good compliance, minor violations (1-3)
- 6: Moderate issues (4-8 violations)
- 3: Poor compliance (9+ violations)
- 0: Guidelines ignored

**Report**:
- Score: X/12
- List violations with file:line
- Guidelines violated most frequently
- Quick wins for compliance

---

### Agent 7: Folder Structure/Organization Analysis (10 points)

**Task**: Evaluate code organization and file placement.

**Evaluate**:
- Feature-based organization (pages/{feature}/ structure?)
- Proper domain grouping (domain/*/services/)
- Shared vs feature-specific code (overuse of shared?)
- File naming consistency (PascalCase components, camelCase utils?)
- Logical module boundaries
- Barrel exports complete

**Scoring Rubric** (10 points):
- 10: Excellent organization, clear boundaries
- 7: Good structure, minor misplacements (2-3 files)
- 5: Moderate issues (unclear boundaries, some files misplaced)
- 2: Poor organization (scattered files, no clear pattern)
- 0: Chaotic structure

**Report**:
- Score: X/10
- Misplaced files with suggested locations
- Organizational improvements
- Quick reorganization wins

---

### Agent 8: Dead Code/Technical Debt Analysis (8 points)

**Task**: Identify unused code and documented debt.

**Evaluate**:
- Unused files (imports? exports?)
- Commented-out code blocks
- TODO/FIXME comments (how many? context?)
- Orphaned components/functions
- Incomplete implementations (half-finished features?)
- Barrel exports referencing missing files

**Scoring Rubric** (8 points):
- 8: Clean codebase, minimal debt, TODOs tracked
- 6: Minor dead code (2-3 unused files)
- 4: Moderate debt (several unused files, many TODOs)
- 2: Significant debt (lots of dead code, untracked TODOs)
- 0: Abandoned code everywhere

**Report**:
- Score: X/8
- List unused files/exports
- Count and categorize TODO/FIXME comments
- Suggested cleanup

---

### Agent 9: Dependencies Analysis (8 points)

**Task**: Evaluate dependency health and management.

**Evaluate**:
- Outdated packages (major versions behind?)
- Unused dependencies (in package.json but not imported?)
- Security vulnerabilities (known issues?)
- Duplicate dependencies (same package multiple versions?)
- Bundle size concerns (huge packages for small features?)
- Workspace protocol usage (workspace:* for internal deps?)

**Scoring Rubric** (8 points):
- 8: Up-to-date, no unused deps, no vulnerabilities
- 6: Few outdated packages (minor versions), no security issues
- 4: Moderate issues (major versions behind, 1-2 unused deps)
- 2: Poor hygiene (many outdated, unused deps, vulnerabilities)
- 0: Critical security issues, abandoned deps

**Report**:
- Score: X/8
- List outdated packages with current vs latest
- Unused dependencies
- Security vulnerabilities
- Recommended updates

---

### Agent 10: Tests Analysis (10 points)

**Task**: Evaluate test coverage and quality.

**Evaluate**:
- Test coverage (what % of critical code tested?)
- Co-location (tests next to source files?)
- Test quality (meaningful assertions? brittle?)
- Testing strategy (unit vs integration balance?)
- Mock usage (appropriate? over-mocked?)
- Test file naming (*.test.ts pattern?)

**Scoring Rubric** (10 points):
- 10: Excellent coverage (80%+), high quality, co-located
- 7: Good coverage (50-80%), mostly co-located
- 5: Moderate coverage (30-50%), some quality issues
- 2: Poor coverage (<30%), brittle tests
- 0: No tests or all broken

**Report**:
- Score: X/10
- Coverage estimate with gaps identified
- Test quality issues
- Recommended test additions

---

## Synthesis Template

After all agents complete, compile results into this format:

```markdown
# Codebase Audit Report

**Mode**: ${mode} | **Scope**: ${scope}
**Total Score**: X/100 (${letter_grade})

---

## Executive Summary

${2-3 sentence overview of codebase health}

**Strengths**:
- ${top_3_strengths}

**Critical Issues**:
- ${top_3_critical_issues}

---

## Section Scores

1. Architecture: X/12 - ${brief_status}
2. Code Clarity/Indirection: X/12 - ${brief_status}
3. Type Safety: X/10 - ${brief_status}
4. Code Duplication: X/8 - ${brief_status}
5. Error Handling: X/10 - ${brief_status}
6. Standards/Best Practices: X/12 - ${brief_status}
7. Folder Structure/Organization: X/10 - ${brief_status}
8. Dead Code/Technical Debt: X/8 - ${brief_status}
9. Dependencies: X/8 - ${brief_status}
10. Tests: X/10 - ${brief_status}

---

## Detailed Findings

${for_each_section_with_issues}:
### ${section_name} (X/Y points)

**Issues**:
- ${issue_1} - file:line
- ${issue_2} - file:line
- ${issue_3} - file:line

**Recommendations**:
- ${fix_1}
- ${fix_2}
- ${fix_3}

---

## Prioritized Refactoring Plan

### High Impact (Do First)
1. ${critical_fix_1} - affects: ${affected_areas}
2. ${critical_fix_2} - affects: ${affected_areas}
3. ${critical_fix_3} - affects: ${affected_areas}

### Medium Impact (Do Next)
1. ${moderate_fix_1} - improves: ${improvement_area}
2. ${moderate_fix_2} - improves: ${improvement_area}

### Low Impact (Nice to Have)
${only_if_mode_is_standard_or_deep}:
1. ${minor_fix_1}
2. ${minor_fix_2}

---

## Quick Wins

${list_3-5_easy_fixes_with_high_return}:
- [ ] ${quick_win_1} - 5 min
- [ ] ${quick_win_2} - 10 min
- [ ] ${quick_win_3} - 15 min

---

## Scoring Legend

- 90-100: A (Excellent)
- 80-89: B (Good)
- 70-79: C (Acceptable)
- 60-69: D (Needs Work)
- 0-59: F (Critical Issues)
```

## Examples

```bash
# Quick cleanup scan - most common use case
/audit

# Same as above (explicit)
/audit cleanup full

# Quick cleanup of workflow feature only
/audit cleanup workflow

# Balanced full report with all severity levels
/audit standard

# Comprehensive backend audit with all details
/audit deep backend

# Quick check of type safety
/audit cleanup types

# Standard analysis of frontend only
/audit standard frontend
```

## Report

Present the complete audit report following the Synthesis Template above.
