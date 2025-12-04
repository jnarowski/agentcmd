---
description: Generate spec using a specific template (simple, multiphase-planning, multiphase-execution)
argument-hint: [template] [context]
---

# Generate Spec with Template

Generate a spec document using a specified template. This command supports three templates:

- **simple**: Single-phase spec for straightforward tasks
- **multiphase-planning**: Three-phase planning (Explore → Clarify → Document)
- **multiphase-execution**: Phased implementation spec with AI handoff prompts

## Variables

- $param1: $1 - Template name (simple | multiphase-planning | multiphase-execution)
- $param2: $2 - Context or feature description

## Instructions

### 1. Determine Template

If $param1 is provided, use that template. Otherwise default to "simple".

Valid templates:
- `simple` - Use the simple spec template
- `multiphase-planning` - Use the PRD planning template with clarification
- `multiphase-execution` - Use the comprehensive phased execution template

### 2. Route to Appropriate Command

Based on the template, execute the corresponding command:

#### For `simple` template:
Execute `/cmd:generate-feature-spec` with the provided context.

#### For `multiphase-planning` template:
Execute `/cmd:generate-prd` with the provided context.

Before generating, follow this process:

**Phase 0: Silent Exploration**
- Search codebase for related patterns using Glob and Grep
- Identify existing conventions and similar implementations
- Gather context for informed questions

**Phase 1: Clarification**
Ask clarifying questions ONE AT A TIME using this format:

```md
**Question**: [Your question]
**Suggestions**:

1. [Option 1] (recommended - why)
2. [Option 2]
3. Other - user specifies
```

Key questions to consider:
- Work type (Feature / Bug / Chore / Task)
- Complexity level (Low / Medium / High)
- Affected layers (UI, State, API, Database, etc.)
- Platform requirements (if applicable)

**Phase 2: PRD Generation**
After clarification, generate the PRD.

#### For `multiphase-execution` template:
Execute `/cmd:generate-feature-spec` with enhanced instructions for:
- Multiple implementation phases (Data → Logic → UI → Testing)
- AI handoff prompts for each phase
- Detailed complexity scoring per task
- Completion notes sections per phase

### 3. Context Integration

If $param2 contains file references (paths starting with @):
- Read those files first to understand context
- Include relevant patterns in the spec
- Reference specific line numbers when applicable

### 4. Output

Follow the output format of the underlying command:
- Simple → Feature spec JSON output
- Multiphase Planning → PRD JSON output
- Multiphase Execution → Feature spec JSON output with enhanced phases

## Examples

### Example 1: Simple spec
```bash
/cmd:generate-spec-with-template simple "Add user profile avatar upload"
```

### Example 2: Multiphase planning with clarification
```bash
/cmd:generate-spec-with-template multiphase-planning "Implement real-time notifications system"
```

### Example 3: Multiphase execution with file references
```bash
/cmd:generate-spec-with-template multiphase-execution "Add OAuth login @src/auth/login.ts @src/api/auth.ts"
```

## Template Details

### Simple Template Structure
- Single-phase implementation
- Basic complexity scoring
- Standard validation commands
- Best for: Bug fixes, small features, config changes

### Multiphase Planning Template Structure
- Problem/Solution analysis
- User personas and requirements
- Technical approach (high-level)
- Risks and mitigations
- Best for: New features needing exploration, unclear requirements

### Multiphase Execution Template Structure
- 4-6 implementation phases
- AI handoff prompts per phase
- Detailed task breakdowns with complexity
- Completion notes sections
- Best for: Large features, team collaboration, phased delivery
