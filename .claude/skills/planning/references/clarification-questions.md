# Clarification Questions Guide

How to ask effective clarification questions during the planning phase.

## Required Format

Ask clarifying questions ONE AT A TIME if implementation approach is unclear:
- **Don't use the Question tool** (AskUserQuestion)
- Use this template:

```md
**Question**: [Your question]
**Suggestions**:

1. [Option 1] (recommended - why)
2. [Option 2]
3. Other - user specifies
```

## Why Conversational Text?

**Planning mode is exploratory**, not decision-making:
- Text-based allows rich context and reasoning
- Natural flow for research and iteration
- Can explain tradeoffs inline
- More flexible for follow-up clarification
- Maintains conversational momentum

**AskUserQuestion tool is for:**
- Final decision gates (rare in planning phase)
- Implementation phase (not planning)
- Very clear binary choices with no context needed

## When to Ask Questions

### DO ask when:
- Multiple valid architectural approaches exist
- User's requirement is ambiguous or incomplete
- Scope boundary is unclear
- Integration approach has tradeoffs
- Technology choice impacts implementation significantly
- External dependencies could go multiple ways

### DON'T ask when:
- Codebase patterns make the choice obvious
- CLAUDE.md or `.agent/docs/` provide clear guidance
- Standard practice exists (follow it)
- Question can be resolved by more research
- Asking would slow down unnecessarily

## Question Templates

### Architecture Decision

```md
**Question**: Should this feature extend the existing [X] system or create a new [Y] pattern?
**Suggestions**:

1. Extend [X] system (recommended - consistent with codebase, found in file:line)
2. Create new [Y] pattern (more flexible, but adds complexity)
3. Other - user specifies
```

### Scope Clarification

```md
**Question**: What's the scope of [feature]? Should it handle [A], [B], or both?
**Suggestions**:

1. [A] only (recommended - simpler, faster to implement)
2. [B] only (more comprehensive, but complex)
3. Both [A] and [B] (future-proof, higher complexity)
4. Other - user specifies
```

### Integration Approach

```md
**Question**: How should this integrate with existing [system]?
**Suggestions**:

1. Use existing [X] API (recommended - follows pattern in file:line)
2. Direct database access (faster, but bypasses validation)
3. Create new service layer (cleanest, but more work)
4. Other - user specifies
```

### Technology Choice

```md
**Question**: Which [library/approach] should we use for [functionality]?
**Suggestions**:

1. [Library A] (recommended - already used in codebase for [similar feature])
2. [Library B] (more features, but new dependency)
3. Custom implementation (no deps, but more maintenance)
4. Other - user specifies
```

### Feature Boundary

```md
**Question**: Should this feature also handle [edge case/related functionality]?
**Suggestions**:

1. No, keep it simple (recommended - focus on core use case)
2. Yes, include [edge case] (more complete, but adds complexity)
3. Other - user specifies
```

### Data Model Decision

```md
**Question**: Should we add a new [Model] table or extend existing [ExistingModel]?
**Suggestions**:

1. Extend [ExistingModel] (recommended - simpler, found similar pattern in file:line)
2. New [Model] table (cleaner separation, but more complexity)
3. Other - user specifies
```

## Real-World Examples

### Example 1: Notification System

```md
**Question**: What type of notifications should this support?
**Suggestions**:

1. In-app only (recommended - uses existing WebSocket pattern from session.handler.ts:45)
2. Email notifications (requires mail service integration, adds complexity)
3. Both in-app and email (comprehensive, but significantly more work)
4. Other - user specifies
```

**Why this is good:**
- Clear, specific question
- Option 1 is recommended with rationale (existing pattern)
- Each option explains complexity tradeoff
- References specific code location

### Example 2: Authentication Strategy

```md
**Question**: How should OAuth tokens be stored?
**Suggestions**:

1. JWT in httpOnly cookie (recommended - matches existing auth pattern in auth.service.ts:89)
2. Database session table (more secure, requires new model)
3. Other - user specifies
```

**Why this is good:**
- Focused on specific implementation detail
- Recommendation aligns with existing codebase
- Provides file reference for context

### Example 3: API Design

```md
**Question**: Should this be a REST endpoint or WebSocket event?
**Suggestions**:

1. WebSocket event (recommended - real-time updates needed, matches workflow.handler.ts pattern)
2. REST endpoint with polling (simpler, but not real-time)
3. Both (supports all clients, but duplicate logic)
4. Other - user specifies
```

**Why this is good:**
- Question drives architectural decision
- Rationale based on requirements (real-time)
- References existing pattern

## One-at-a-Time Strategy

### ✅ Good: Sequential clarification
```
[Ask Question 1]
[Wait for answer]
[Ask Question 2 based on answer to Question 1]
[Wait for answer]
[Ask Question 3 if still needed]
```

### ❌ Bad: Multiple questions at once
```
I have several questions:
1. Architecture approach?
2. Technology choice?
3. Scope boundaries?
4. Integration strategy?

Please answer all of these.
```

**Why sequential is better:**
- Answers to earlier questions inform later questions
- Less overwhelming for user
- Maintains conversational flow
- Allows for clarification and follow-up

## After Getting Answers

Once clarification is received:
1. **Acknowledge**: "Got it, using [approach]"
2. **Continue research**: If answer reveals new areas to explore
3. **Update findings**: Incorporate decision into research summary
4. **Ask follow-up**: Only if truly needed
5. **Proceed**: Move to complexity assessment or next research area

## Integration with Research

Questions should arise from research:
```
Research → Found multiple patterns → Need clarification → Ask question → Continue research
```

Not:
```
Start → Ask generic questions → Maybe research later
```

## Tips

- **Ground questions in research**: Reference specific files/patterns found
- **Explain tradeoffs**: Help user make informed decision
- **Be opinionated**: Recommend an option with rationale
- **Stay focused**: One question at a time, specific and actionable
- **Use context**: Explain why this question matters to the implementation
- **Respect user's choice**: If they pick non-recommended option, proceed without arguing
