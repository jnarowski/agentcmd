---
description: Generate a new slash command with consistent structure and best practices
argument-hint: [command-name, description]
---

# Generate Slash Command

Create a new slash command following team conventions and best practices. Read Instructions and follow Workflow steps in exact order.

## Variables

- $command-name: $1 (required) - The name of the command (e.g., "test", "commit", "generate-spec")
- $description: $2 (optional) - Brief description of what the command does

## Instructions

- Normalize $command-name (lowercase, hyphenated) for the filename
- If command name is not provided, stop IMMEDIATELY and ask the user to provide one
- If description is not provided, stop IMMEDIATELY and ask the user to provide one
- All slash commands are markdown files in `.claude/commands/` directory
- Commands should be clear, actionable, and follow existing patterns
- Use frontmatter for metadata (description, argument-hint)

## Workflow

1.  Ask clarifying questions if needed:
    a. Ask questions ONE AT A TIME.
    b. Follow this template below (provide two options and specify which you recommend and why)

                 ```md
                 **Question**: The question you have
                 **Suggestions**
                 1: Something (recommended)
                 2: Something else
                 3: Other - user specifies
                 ```

    c. question examples

    - Does this command take arguments?
    - Does it generate a file or perform an action?
    - Does it need to interact with external tools (git, npm, etc.)?
    - Should it follow a specific template or workflow?

2.  Once you have all context, generate the command file following the exact structure in Template below
3.  Write the command to `.claude/commands/${command-name}.md`
4.  Report the file path created

## Slash Command Types

### Action Commands

Commands that perform operations (commit, test, review)

- Focus on step-by-step instructions
- Include validation steps
- Provide clear success criteria

### Generator Commands

Commands that create files from templates (generate-prd, generate-feature)

- Define variables and argument handling
- Include a complete template section
- Specify output file path
- Include formatting rules

### Orchestration Commands

Commands that coordinate multiple agents or complex workflows (generate-research, implement-spec)

- Define clear workflow phases
- Include subagent templates if parallel execution needed
- Provide synthesis/reporting structure

## Frontmatter Guidelines

**description:**

- Keep under 80 characters
- Be specific about what the command does
- Use action verbs (Generate, Create, Run, Deploy, etc.)
- Examples:
  - "Create a git commit with staged changes following team conventions"
  - "Generate implementation spec with phased approach and validation"
  - "Execute the project's test suite and report results"

**argument-hint:**

- Use square brackets with comma-separated arguments
- Optional arguments can be marked with "optional" or just by convention
- Examples:
  - `[feature-name, context]`
  - `[spec-name-or-path]`
  - `[command-args]`
  - `[]` (for commands with no arguments)

## Best Practices

1. **Be Specific**: Avoid vague instructions. Specify exact file paths, commands, and expected outputs.

2. **Be Actionable**: Every instruction should be something Claude can act on immediately.

3. **Use Variables**: For arguments, define them clearly with `$variable-name = $N` syntax.

4. **Include Validation**: Tell Claude how to verify the command succeeded.

5. **Handle Edge Cases**: Address what to do if files don't exist, arguments are missing, etc.

6. **Follow Patterns**: Look at existing commands in `.claude/commands/` for inspiration.

7. **Keep It Focused**: One command should do one thing well. Break complex operations into multiple commands.

8. **Add Examples**: Show concrete usage to clarify intent.

## Structure Patterns

### Simple Action Command

- Title and description
- Instructions (bullet list)
- Examples (optional)

### Generator with Template

- Variables section
- Instructions
- Workflow
- Template section (in markdown code block)
- Formatting Rules
- Report section

### Multi-Agent Orchestrator

- Variables
- Instructions
- Workflow
- Subagent Templates (multiple subsections)
- Synthesis Template
- Notes and examples

## Template

```md
---
description: <One line description (50-80 chars)>
argument-hint: [arg1, arg2, optional-arg3]
---

# <Command Title>

<2-3 sentence description of what this command does and when to use it>

## Variables (if command takes arguments)

- $arg1: $1 (required/optional) - <description>
- $arg2: $2 (required/optional) - <description>

## Instructions (optional - used to provide additional clarification on things that don't fit into ordered Workflow steps.)

<Key behavioral rules and requirements>
- <Important rule 1>
- <Important rule 2>
- <Validation or constraint>

## Workflow (if multi-step process)

1. <First major step>
2. <Second major step>
3. <Final step and reporting>

## [Section Name] (add relevant sections based on command type)

<For action commands: step-by-step instructions>
<For generators: template structure>
<For orchestrators: subagent definitions>

## Examples (optional but recommended)

<Show concrete usage examples>

## Common Pitfalls (optional)

- <Thing to avoid>
- <Common mistake>

## Report (if command generates output)

- IMPORTANT: <What the command should report back to the user>
```

## Validation Checklist

Before finalizing the command file, verify:

- [ ] Frontmatter is valid YAML with description and argument-hint
- [ ] Variables are clearly defined with required/optional markers
- [ ] Instructions are specific and actionable
- [ ] Workflow steps are in logical order
- [ ] Templates (if any) use `<placeholder>` syntax consistently
- [ ] File paths are specified (not generic names)
- [ ] Success criteria or reporting is defined
- [ ] Command follows existing patterns in the codebase

## Report

- Return the full path to the command file created
- Suggest trying the command with: `/command-name`
