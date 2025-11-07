---
description: Generate a focused Product Requirements Document (PRD) with high-level technical specification, optimized for startups and small teams
argument-hint: [featurename, context, format]
---

# Generate PRD

Create a concise, actionable Product Requirements Document from the provided description: `context` following the steps outlined in Workflow.

## Variables

- $featurename: $1 (optional)
- $context: $2 (optional)
- $format: $3 (optional) - Output format: "text" or "json" (defaults to "text" if not provided)

## Instructions

- If no feature name provided, generate one from the context (e.g., "auth-system", "search-feature")
- If no context provided, analyze the existing conversation for requirements and set to $context
- Normalize $featurename (lowercase, hyphenated) for the output path
- If $format is not provided, default to "text"

## Workflow

<!-- prettier-ignore-->
1. **Important** Analyze the $context and ask any clarifying questions
   a. Ask one at a time.
   b. Focus on:
      - Missing user details or use cases
      - Unclear technical constraints
      - Ambiguous success metrics
      - Timeline if not specified
   c. Follow this template below (provide two options and specify which you recommend and why)

```md
      **Question**: The question you have

      **Suggestions**
      1. Something (recommended)
      2. Something else
      3. Other - user specifies
```

2.  Once you have all the context that you need, generate a focused 1-2 page PRD following the exact structure outlined in PRD Template below. Be concise but comprehensive. Skip sections only if truly not applicable.
3.  Write this prd doc to `.agent/specs/${featurename}-prd.md`

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

Remember: This PRD should be scannable in 3 minutes and actionable immediately. The technical section should give engineers enough to estimate effort and identify risks, but NOT enough to start coding. Detailed implementation specs come later.

## Report

### JSON

**IMPORTANT**: If $format is "json", return raw JSON output (no ```json code fences, no markdown):

```json
{
  "success": true,
  "prd_path": ".agent/specs/featurename-prd.md",
  "feature_name": "featurename",
  "primary_objective": "One sentence describing the main objective"
}
```

**JSON Field Descriptions:**

- `success`: Always true if PRD generation completed
- `prd_path`: Path to the generated PRD file
- `feature_name`: Normalized feature name (lowercase, hyphenated)
- `primary_objective`: The main objective from the PRD

### Text

Otherwise, provide this human-readable information to the user:

- IMPORTANT: Return exclusively the path to the PRD file created and nothing else.
