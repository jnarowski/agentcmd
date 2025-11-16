# AgentCmd Documentation Generation

**Status**: review
**Created**: 2025-11-16
**Package**: apps/website
**Phases**: 10
**Tasks**: 46

## Overview

Generate comprehensive user-facing documentation for AgentCmd with auto-update capability via `/refresh-docs` slash command.

## Documentation Approach

- **Audience**: Intermediate (familiar with AI CLI tools)
- **Format**: Mermaid diagrams for concepts, code-heavy for reference
- **Examples**: Tiered (ultra-simple → focused → real workflows)
- **Tone**: Technical & concise but fun
- **Structure**: Follow Fumadocs conventions
- **Update Strategy**: Generated docs serve as templates, surgical updates to AUTO-GENERATED sections

## Auto-Update System

**Sources of Truth** (6):
1. TypeScript types (`packages/agentcmd-workflows/src/types/steps.ts`)
2. Slash commands (`.claude/commands/**/*.md`)
3. Example workflows (`.agent/workflows/definitions/example-*.ts`)
4. Package exports (`packages/*/src/index.ts`)
5. CLI definitions (`apps/app/src/cli/index.ts`)
6. Environment variables (`apps/app/.env.example`)

**Process**:
- Extract context from sources
- Read existing docs as templates
- Surgical updates to `<!-- AUTO-GENERATED:id -->` sections
- Comprehensive validation (links, syntax, signatures)
- Report changes without auto-commit

## Implementation Tasks

### Phase 1: Infrastructure ✅

- [x] Create spec doc
- [x] Create `/refresh-docs` slash command
- [x] Create `refresh-docs-workflow.ts`

### Phase 2: Getting Started ✅

- [x] `index.mdx` - Introduction, what is AgentCmd
- [x] `getting-started/installation.mdx` - Install + verify
- [x] `getting-started/quick-start.mdx` - First project + UI tour
- [x] `getting-started/first-workflow.mdx` - 10-line tutorial
- [x] `getting-started/meta.json` - Sidebar config

### Phase 3: Core Concepts ✅

- [x] `concepts/workflows.mdx` - Orchestration + Mermaid diagram
- [x] `concepts/phases.mdx` - Organization + Mermaid diagram
- [x] `concepts/steps.mdx` - 8 types overview table
- [x] `concepts/sessions.mdx` - Conversations + resumption
- [x] `concepts/projects.mdx` - Repository management
- [x] `concepts/specs.mdx` - Feature lifecycle + Mermaid diagram
- [x] `concepts/meta.json` - Sidebar config

### Phase 4: Step Types Reference ✅

- [x] `reference/steps/index.mdx` - Comparison table
- [x] `reference/steps/agent.mdx` - AUTO-GENERATED config
- [x] `reference/steps/ai.mdx` - AUTO-GENERATED config
- [x] `reference/steps/cli.mdx` - AUTO-GENERATED config
- [x] `reference/steps/git.mdx` - AUTO-GENERATED config
- [x] `reference/steps/artifact.mdx` - AUTO-GENERATED config
- [x] `reference/steps/annotation.mdx` - AUTO-GENERATED config
- [x] `reference/steps/phase.mdx` - AUTO-GENERATED config
- [x] `reference/steps/log.mdx` - AUTO-GENERATED config
- [x] `reference/steps/meta.json` - Sidebar config
- [x] `reference/meta.json` - Reference section config

### Phase 5: Building Workflows ✅

- [x] `guides/workflow-definition.mdx` - AUTO-GENERATED API
- [x] `guides/type-safe-arguments.mdx` - AUTO-GENERATED schema
- [x] `guides/context-sharing.mdx` - Closure pattern
- [x] `guides/error-handling.mdx` - Try/catch, retries
- [x] `guides/meta.json` - Sidebar config

#### Completion Notes

- Created comprehensive workflow building guides covering definition API, type-safe arguments, context sharing patterns, and error handling
- Included AUTO-GENERATED sections for API references that can be updated by /refresh-docs
- Used Fumadocs components (Tabs, Callout) for rich content presentation
- Provided tiered examples from simple to complex in all guides
- Added cross-references to related documentation sections

### Phase 6: Agent Integration ✅

- [x] `agents/permission-modes.mdx` - Comparison table
- [x] `agents/json-mode.mdx` - Structured extraction
- [x] `agents/session-resumption.mdx` - Mermaid + code
- [x] `agents/multi-agent.mdx` - Claude/Codex/Gemini comparison
- [x] `agents/meta.json` - Sidebar config

#### Completion Notes

- Created comprehensive agent integration docs covering permission modes, JSON mode, session resumption, and multi-agent orchestration
- Included comparison tables for permission modes and AI agents
- Added Mermaid diagrams for session lifecycle and resumption flow
- Provided tiered examples from simple to complex for all topics
- Used Fumadocs components (Callout, Tabs) throughout
- Fixed missing Callout imports in getting-started files
- All docs build successfully

### Phase 7: Configuration & CLI Reference ✅

- [x] `reference/cli.mdx` - AUTO-GENERATED commands
- [x] `reference/configuration.mdx` - AUTO-GENERATED env vars
- [x] `reference/sdk-api.mdx` - AUTO-GENERATED exports
- [x] `reference/slash-commands.mdx` - AUTO-GENERATED from .claude/commands/
- [x] `reference/meta.json` - Sidebar config

#### Completion Notes

- Created comprehensive CLI reference with all commands, options, and examples
- Documented configuration file structure and environment variables
- Added SDK API reference with TypeScript types and examples
- Documented slash commands with usage patterns
- All reference docs include AUTO-GENERATED markers for future updates
- Updated reference/meta.json with new pages

### Phase 8: Examples & Recipes ✅

- [x] `examples/basic-automation.mdx` - From example-basic-workflow.ts
- [x] `examples/spec-implementation.mdx` - From example-implement-review-workflow.ts
- [x] `examples/data-processing.mdx` - Custom AI example
- [x] `examples/custom-slash-command.mdx` - End-to-end tutorial
- [x] `examples/meta.json` - Sidebar config

#### Completion Notes

- Created 4 comprehensive example guides (16-23KB each, 800-1000 lines)
- Progressive examples: ultra-simple → focused → production-ready
- Covered: basic automation, spec implementation, data processing, custom commands
- All examples are copy-paste ready with complete TypeScript code
- Included best practices, common pitfalls, and advanced patterns
- Used Callout and Tabs components for rich presentation

### Phase 9: Advanced Topics ✅

- [x] `advanced/multi-phase-workflows.mdx` - Plan→Implement→Review
- [x] `advanced/workspace-management.mdx` - Worktrees, isolation
- [x] `advanced/artifact-management.mdx` - Upload/download
- [x] `advanced/ci-cd-integration.mdx` - Automated triggers
- [x] `advanced/meta.json` - Sidebar config

#### Completion Notes

- Created 4 comprehensive advanced guides (19-26KB each, 800-1000 lines)
- Covered: multi-phase patterns, git worktrees, artifact management, CI/CD
- Included Mermaid architecture diagrams for complex workflows
- Production-ready examples for GitHub Actions, GitLab CI, CircleCI, Jenkins
- Security best practices, performance optimization, troubleshooting
- Deep technical content for advanced users

### Phase 10: Troubleshooting ✅

- [x] `troubleshooting/common-errors.mdx` - Database, timeouts
- [x] `troubleshooting/workflow-failures.mdx` - Debugging
- [x] `troubleshooting/connection-problems.mdx` - WebSocket, Inngest
- [x] `troubleshooting/meta.json` - Sidebar config

#### Completion Notes

- Created 3 comprehensive troubleshooting guides (13-25KB each)
- Problem → Diagnosis → Solution format for quick resolution
- Covered: installation issues, port conflicts, database errors, workflow failures, connection problems
- Diagnostic commands with exact syntax for debugging
- Prevention tips and quick reference cheat sheets
- All solutions tested against actual AgentCmd architecture

## Success Criteria

- Users build first workflow in <30 min after reading Getting Started
- Step configs always match codebase (auto-generated)
- Mermaid diagrams clarify complex concepts
- Progressive examples support learning curve
- `/refresh-docs` keeps reference sections current
- All docs follow Fumadocs conventions
- Technical & concise tone with personality maintained

## Deliverables

- 1 spec doc (this file)
- 1 slash command + workflow for auto-updates
- ~45 documentation pages
- 6 auto-generated reference sections
- Fumadocs-compliant structure
- Mermaid diagrams for concepts
- Tiered examples (simple → production)
