---
name: planning
description: This skill should be used when in planning/plan mode, or when the user wants to plan features, research implementations, or understand the codebase before generating specs. Use this for exploratory research and clarification before implementation.
---

# Planning Skill

## Overview

This skill provides comprehensive planning workflows for features and system changes. It focuses on the **research and clarification phase** - gathering context, exploring architecture, and asking good questions before spec generation.

## When to Use This Skill

Use this skill when:
- **In planning/plan mode** (auto-trigger if possible)
- User says: "plan this", "research this feature", "help me understand"
- User asks: "what do I need to know before implementing X?"
- Before generating specs with `/cmd:generate-spec`
- Need to explore codebase patterns and architecture

## Core Workflow

### 1. Research Phase
- Explore codebase for similar existing features
- Identify which domain/area this belongs in
- Locate related types, schemas, services, routes
- Check test patterns in relevant areas
- Review database models (if applicable)
- Use `references/research-checklist.md` for systematic exploration

### 2. Context Gathering
- **Internal docs**: Check `.agent/docs/` for relevant patterns
- **CLAUDE.md**: Review project conventions and rules
- **context7 MCP** (if available): Fetch external library docs
  - Check for `mcp__context7__*` tools
  - Use for React, Fastify, Prisma, etc. documentation
  - Fall back to WebFetch/WebSearch if not available
- See `references/context-sources.md` for detailed guidance

### 3. Clarification (If Needed)
Ask clarifying questions ONE AT A TIME if implementation approach is unclear:
- **Don't use the Question tool**
- Use this template:
  ```md
  **Question**: [Your question]
  **Suggestions**:

  1. [Option 1] (recommended - why)
  2. [Option 2]
  3. Other - user specifies
  ```
- See `references/clarification-questions.md` for examples and templates

### 4. Complexity Assessment
- Estimate file count and scope
- Identify cross-cutting concerns
- Assess if new patterns needed or extending existing
- Determine context requirements for implementation
- Flag if complexity suggests breaking into smaller features
- See `references/complexity-assessment.md` for detailed rubric

### 5. Handoff to Spec Generation
Prepare clear summary for `/cmd:generate-spec`:
- What was found during research
- Existing patterns to follow
- Recommended architecture approach
- Initial complexity estimate
- Unresolved questions (if any)
- Suggest: "Ready to generate spec with `/cmd:generate-spec`?"

## Key Principles

### Do
- ✅ Research deeply - explore codebase thoroughly
- ✅ Ask questions conversationally (text-based, ONE AT A TIME)
- ✅ Document findings clearly
- ✅ Leverage context7 MCP when available for external docs
- ✅ Check `.agent/docs/` for internal patterns
- ✅ Provide architecture recommendations with rationale
- ✅ Prepare handoff context for spec generation

### Don't
- ❌ Use AskUserQuestion tool (breaks exploratory flow)
- ❌ Create specs or files (that's `/cmd:generate-spec`'s job)
- ❌ Ask multiple questions at once
- ❌ Skip research phase
- ❌ Make assumptions without checking codebase first

## Complementary to Slash Commands

This skill **complements** existing spec generation:

```
User request → Planning skill (research) → /cmd:generate-spec (spec creation)
```

- **Planning skill**: Research, clarification, architecture exploration
- **/cmd:generate-spec**: Spec writing, file creation, index updates
- **/generate-prd**: PRD creation for larger features
- **/generate-feature**: Alternative spec format

## Level of Involvement

**Moderate** - Balance depth with efficiency:
- **Research deeply**: Explore codebase, find patterns, identify constraints
- **Ask strategically**: ONE question at a time with context-based suggestions
- **Document findings**: Summarize architecture, existing patterns, complexity
- **Prepare handoff**: Create clear context for spec generation
- **Don't overstep**: Leave spec writing and file creation to slash commands

## References

See `references/` directory for detailed guidance:
- `research-checklist.md` - Systematic codebase exploration
- `clarification-questions.md` - Question templates and examples
- `complexity-assessment.md` - Complexity rubric and indicators
- `context-sources.md` - How to leverage context7, internal docs, codebase

## Example Usage

```
User: "Plan adding user notifications feature"

Planning skill workflow:
1. Research: Find existing notification patterns (grep for "notification", "alert", etc.)
2. Check: `.agent/docs/` for notification architecture (if exists)
3. Context7: Fetch WebSocket or push notification docs (if needed)
4. Ask: "What type of notifications? In-app, email, push, or all three?"
   Suggestions:
   1. In-app only (recommended - simpler, use WebSocket pattern)
   2. Email integration (adds complexity, need mail service)
   3. Other - user specifies
5. Wait for answer, continue clarification as needed
6. Assess: Initial complexity ~5-6/10 (multiple files, WebSocket integration)
7. Output: "Found WebSocket handler pattern in X, session events in Y.
   Recommend: Extend existing WebSocket system, add Notification model,
   create UI toast component. Estimated 5-6/10 complexity."
8. Suggest: "Ready to generate spec with /cmd:generate-spec?"
```

## Integration Notes

- **context7 MCP**: Optional but recommended for external docs
  - Install: https://context7.com/
  - Check availability before use
  - Graceful fallback to WebFetch/WebSearch
- **Permission mode**: Works best in plan mode (read-only exploration)
- **Output**: Text summary, not files (spec generation creates files)
