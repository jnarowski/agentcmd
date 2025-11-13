---
description: Generate PRD with high-level technical spec in spec folder structure
argument-hint: [context-or-spec-id?, context?]
---

# Generate PRD

Create a concise, actionable Product Requirements Document (PRD) with high-level technical specification. Saves to `.agent/specs/todo/[id]-[feature]/prd.md` with timestamp-based ID.

## Variables

- $param1: $1 (optional) - Either 12-digit spec ID to reuse existing folder, or context string for new PRD
- $param2: $2 (optional) - Additional context (only used if $1 is spec ID)

## Instructions

- **IMPORTANT**: This command ONLY generates PRD - do NOT implement code or create implementation specs
- PRDs are reference documents - NOT tracked in index.json
- Normalize feature name to kebab-case for folder name
- Replace ALL `<placeholders>` with specific details
- Stay HIGH LEVEL - this is for planning, not implementation
- Focus on DECISIONS not details
- Keep concise: ~700-1000 words total

## Workflow

1. **Determine Context**:
   - If no explicit context: Use conversation history
   - If spec ID provided: Read existing folder + conversation history
   - Otherwise: Use provided context string

   **Detection:**
   - If $1 matches /^\d{12}$/: It's a spec ID → reuse folder
   - Otherwise: $1 is context (or empty) → create new folder

2. **Generate or Reuse Spec ID**:
   - If reusing folder: Extract spec ID from $1
   - If new folder: Generate timestamp-based ID in format `YYMMDDHHmmss`
   - Example: November 13, 2025 at 3:22:01pm → `251113152201`

3. **Generate Feature Name**:
   - Generate concise kebab-case name from context (max 4 words)
   - Examples: "OAuth integration" → "oauth-integration", "User dashboard" → "user-dashboard"
   - If reusing folder: Extract name from existing folder path

4. **Clarification** (conditional):
   - Ask clarifying questions ONE AT A TIME:
     - Missing user details or use cases
     - Unclear technical constraints
     - Ambiguous success metrics
     - Timeline if not specified

   - Use this template:
     ```md
     **Question**: [Your question]
     **Suggestions**:
     1. [Option 1] (recommended - why)
     2. [Option 2]
     3. Other - user specifies
     ```

5. **Generate PRD**:
   - Follow PRD Template below
   - Be concise but comprehensive
   - Skip sections only if truly not applicable

6. **Write PRD Folder and File**:
   - If new folder: Create folder `.agent/specs/todo/{timestampId}-{featureName}/`
   - If reusing: Verify folder exists
   - Write to `prd.md` in folder
   - Example: `.agent/specs/todo/251113152201-oauth-integration/prd.md`
   - **Note**: PRDs are NOT tracked in index.json (reference docs only)

## PRD Template

```md
# [Product Name] PRD

**Date:** [Current Date]
**Version:** 1.0

## Overview

[2-3 sentences: Product name, core value proposition, target launch timeframe]

## Problem Statement

- **Problem:** [What specific problem are we solving?]
- **Why now:** [Why does this problem matter now?]
- **Cost of inaction:** [What happens if we don't solve it?]

## Objectives & Success Metrics

**Primary Objective:** [One main goal]

**Key Metrics:**

- [Metric 1 with specific target]
- [Metric 2 with specific target]
- [Metric 3 with specific target]

**Measurement Timeline:**

- 30 days: [Success criteria]
- 60 days: [Success criteria]
- 90 days: [Success criteria]

## Users

**Primary Persona:** [Who desperately needs this]

- **Job to be done:** [Core task they're trying to accomplish]
- **Current frustrations:** [Pain points with existing solutions]

## Solution Requirements

| Requirement | Priority | User Story                                         | Acceptance Criteria |
| ----------- | -------- | -------------------------------------------------- | ------------------- |
| [Feature]   | P0       | As a [user], I want [capability] so that [benefit] | [Testable criteria] |
| [Feature]   | P1       | ...                                                | ...                 |
| [Feature]   | P2       | ...                                                | ...                 |

**Priority Levels:**

- P0 (Must Have) - MVP blockers
- P1 (Should Have) - Important but not blockers
- P2 (Could Have) - Nice to have
- P3 (Won't Have) - Future consideration

## Technical Specification

### Architecture Approach

- **Type:** [Monolith/Microservice/Serverless]
- **API Style:** [REST/GraphQL/RPC]
- **Frontend:** [SPA/SSR/Static]
- **Infrastructure:** [Cloud provider/deployment target]

### Technical Decisions

- **Core Stack:** [Language/framework choices]
- **Database:** [Type and reasoning]
- **Auth:** [Method]
- **Key Dependencies:** [Critical third-party services]

### Integration Requirements

- **External Systems:** [List of systems to connect]
- **Data Sync:** [Real-time/batch/webhook needs]
- **API Constraints:** [Rate limits, quotas]

### Performance Requirements

- **Response Time:** [Target for critical operations]
- **Scale:** [Concurrent users, data volume]
- **Availability:** [Uptime target]

### Security & Compliance

- **Data Privacy:** [PII handling approach]
- **Compliance:** [GDPR/SOC2/HIPAA requirements]
- **Auth Requirements:** [Authentication/authorization needs]

## Constraints & Assumptions

**Constraints:**

- [Technical limitations]
- [Resource limitations]
- [Timeline limitations]

**Assumptions:**

- [Key assumption 1]
- [Key assumption 2]

## Risks & Mitigations

| Risk     | Probability  | Impact       | Mitigation |
| -------- | ------------ | ------------ | ---------- |
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] |
| [Risk 2] | High/Med/Low | High/Med/Low | [Strategy] |

## Out of Scope

- [Feature/capability not in v1]
- [Technical approach we're not taking]
- [Future consideration]

## Definition of Done

- [ ] [Launch criteria 1]
- [ ] [Launch criteria 2]
- [ ] [Required documentation]
- [ ] [Deployment requirement]
- [ ] [Quality gates passed]
```

## Formatting Rules

- Use markdown headers, tables, and bullet points
- Bold key metrics and dates
- Keep sections brief - no fluff
- Total output should be ~700-1000 words
- Write in present tense
- Be specific with numbers and dates where possible

## Technical Specification Guidelines

- Stay HIGH LEVEL - this is for planning, not implementation
- Focus on DECISIONS not details
- Include enough for effort estimation
- Don't specify exact endpoints, schemas, or code structure
- Think "what stack" not "what functions"

## Tone

- Direct and actionable
- Assume reader has context
- Focus on clarity over completeness
- Optimize for speed of understanding

**Remember:** This PRD should be scannable in 3 minutes and actionable immediately. The technical section should give engineers enough to estimate effort and identify risks, but NOT enough to start coding. Detailed implementation specs come later.

## Examples

### Example 1: Infer from conversation

```bash
/cmd:generate-prd
```

Analyzes conversation history, generates ID `251113152201`, creates: `.agent/specs/todo/251113152201-oauth-integration/prd.md`

### Example 2: Explicit context

```bash
/cmd:generate-prd "OAuth integration with Google and GitHub for enterprise customers"
```

Uses explicit context, generates ID `251113152201`, creates: `.agent/specs/todo/251113152201-oauth-integration/prd.md`

### Example 3: Add PRD to existing spec folder

```bash
/cmd:generate-prd 251113150000
```

Reuses existing folder, infers context from conversation, adds: `.agent/specs/todo/251113150000-oauth-integration/prd.md`

### Example 4: Add PRD with explicit context

```bash
/cmd:generate-prd 251113150000 "OAuth integration details"
```

Reuses folder, uses explicit context, adds: `.agent/specs/todo/251113150000-oauth-integration/prd.md`

## Common Pitfalls

- **Spec ID format**: Must be exactly 12 digits to be recognized as folder reuse
- **Too detailed**: PRDs are high-level planning docs, not implementation specs
- **Wrong directory**: Always create folder in `.agent/specs/todo/`
- **No index update**: PRDs are reference docs, NOT tracked in index.json
- **Generic placeholders**: Replace all `<placeholders>` with actual content
- **Too long**: Keep to ~700-1000 words total

## Report

**IMPORTANT**: After completing all steps, output this JSON as your final message:

<json_output>
{
  "success": true,
  "prd_folder": ".agent/specs/todo/[id]-[feature]",
  "prd_file": ".agent/specs/todo/[id]-[feature]/prd.md",
  "spec_id": "[id]",
  "spec_type": "prd",
  "feature_name": "[feature-name]",
  "primary_objective": "[main objective]",
  "next_command": "/cmd:generate-spec [id]"
}
</json_output>

**JSON Field Descriptions:**

- `success`: Always true if PRD generation completed
- `prd_folder`: Path to the created folder
- `prd_file`: Full path to the PRD file
- `spec_id`: The timestamp-based ID in YYMMDDHHmmss format
- `spec_type`: Always "prd"
- `feature_name`: Normalized feature name (kebab-case)
- `primary_objective`: The main objective from the PRD
- `next_command`: Suggested next command (generate implementation spec in same folder)
