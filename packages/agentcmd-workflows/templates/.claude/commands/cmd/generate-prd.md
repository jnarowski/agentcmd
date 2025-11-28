---
description: Generate PRD with high-level technical spec in spec folder structure
argument-hint: [context?]
---

# Product Requirements Document (PRD)

Generate high-level PRD focusing on "what" and "why" before implementation. Creates folder at `.agent/specs/todo/[id]-[feature]/prd.md` with timestamp-based ID.

## Variables

- $param1: $1 (optional) - Feature context or description (infers from conversation if omitted)

## Instructions

- **IMPORTANT**: Use your reasoning model - THINK HARD about feature requirements, user needs, and business value
- **IMPORTANT**: This command ONLY generates the PRD - do NOT implement any code or make file changes beyond creating the folder/file and updating index.json
- Normalize feature name to kebab-case for the folder name
- Replace ALL `<placeholders>` with specific details relevant to that section
- Focus on WHAT and WHY, not HOW (save implementation details for spec)
- Keep it high-level but comprehensive
- **DO NOT include implementation tasks or complexity scores** - this is for planning only

## Workflow

1. **Determine Context**:
   - If $param1 provided: Use as context
   - If $param1 empty: Infer from conversation history

2. **Generate Spec ID**:
   - Generate timestamp-based ID in format `YYMMDDHHmm` using current local time
   - Example: November 13, 2025 at 3:22pm local → `2511131522`
   - Read `.agent/specs/index.json` (will be updated in step 8)

3. **Generate Feature Name**:
   - Generate concise kebab-case name from context (max 4 words)
   - Examples: "Add OAuth support" → "oauth-support", "Dashboard redesign" → "dashboard-redesign"

4. **Research Phase**:
   - Research codebase for existing patterns relevant to the feature
   - Gather context about architecture, file structure, and conventions
   - Look for similar features for inspiration

5. **Clarification** (conditional):
   - **If explicit context provided**: Resolve ambiguities autonomously using recommended best practices
   - **If inferring from conversation**: Ask clarifying questions ONE AT A TIME if requirements are unclear:
     - Don't use the Question tool
     - Use this template:

       ```md
       **Question**: [Your question]
       **Suggestions**:

       1. [Option 1] (recommended - why)
       2. [Option 2]
       3. Other - user specifies
       ```

6. **Generate PRD**:
   - Once you have sufficient context, generate the PRD following the Template below
   - Focus on requirements, user value, and high-level approach
   - Be concise but comprehensive
   - Skip sections only if truly not applicable

7. **Write PRD Folder and File**:
   - Create folder `.agent/specs/todo/{timestampId}-{featureName}/`
   - Write `prd.md` in folder (never `prd.json`)
   - Example: `.agent/specs/todo/2511131522-oauth-support/prd.md`
   - **Note**: PRDs always start in `todo/` folder with Status "draft"

8. **Update Index**:
   - Convert spec ID timestamp to UTC for storage:
     - Parse spec ID as local time (e.g., `2511131522` = Nov 13, 2025 at 3:22pm local)
     - Convert to UTC using system timezone offset
     - Format as ISO 8601 UTC string (YYYY-MM-DDTHH:mm:ssZ)
     - Example: 3:22pm MST (UTC-7) → `2025-11-13T22:22:00Z`
   - Add minimal entry to index.json using timestamp ID as key (NO path field):

     ```json
     {
       "specs": {
         "2511131522": {
           "folder": "2511131522-oauth-support",
           "spec_type": "prd",
           "status": "draft",
           "created": "2025-11-13T22:22:00Z",
           "updated": "2025-11-13T22:22:00Z"
         }
       }
     }
     ```

   - **IMPORTANT**: The `created` and `updated` timestamps must be true UTC, not local time with Z suffix
   - **IMPORTANT**: PRD entries have NO `path` field - this indicates no implementation spec exists yet
   - Write updated index back to `.agent/specs/index.json`

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

Analyzes conversation history, generates ID `2511131522`, creates: `.agent/specs/todo/2511131522-oauth-support/prd.md`

### Example 2: Explicit context

```bash
/cmd:generate-prd "Add OAuth support with Google and GitHub providers"
```

Uses explicit context, generates ID `2511131522`, creates: `.agent/specs/todo/2511131522-oauth-support/prd.md`

## Common Pitfalls

- **Wrong directory**: Always create folder in `.agent/specs/todo/`, not `.agent/specs/`
- **Folder structure**: Must create folder `{timestampId}-{feature}/` with `prd.md` inside (e.g., `2511131522-oauth-support/`)
- **Index not updated**: Always update index.json after creating PRD
- **Path field in index**: PRD entries should NOT have a `path` field - only add path when spec is generated
- **Generic placeholders**: Replace all `<placeholders>` with actual content
- **Including implementation details**: Keep high-level - save tasks and complexity for spec
- **Status field**: Use lowercase status values: `draft`, `ready`, `in-progress`, `review`, `completed`
- **Kebab-case**: Always convert feature name to kebab-case for folder name

## Report

**IMPORTANT**: After completing all steps (1-8), output ONLY raw JSON (see `.agent/docs/slash-command-json-output-format.md`).

<json_output>
{
  "success": true,
  "spec_folder": ".agent/specs/todo/[id]-[feature]",
  "prd_file": ".agent/specs/todo/[id]-[feature]/prd.md",
  "spec_id": "[id]",
  "spec_type": "prd",
  "feature_name": "[feature-name]",
  "next_command": "/cmd:add-spec [id]"
}
</json_output>

**JSON Field Descriptions:**

- `success`: Always true if PRD generation completed
- `spec_folder`: Path to the created spec folder
- `prd_file`: Full path to the PRD file (always prd.md)
- `spec_id`: The timestamp-based spec ID in YYMMDDHHmm format (e.g., "2511131522")
- `spec_type`: Always "prd"
- `feature_name`: Normalized feature name (kebab-case)
- `next_command`: Suggested next command to run (add-spec to create implementation spec)

**Output Examples:**

❌ BAD:
Perfect! PRD generated. Here's the summary:
{ "success": true, ... }
Ready to generate spec!

✅ GOOD:
{ "success": true, ... }
