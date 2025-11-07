# Gabby AI - Agent Workflow Platform Summary

**Last Updated**: 2025-11-02

---

## Overview

Gabby AI (also called "gobby" in codebase) is a platform for managing dynamic, configurable AI agent templates that enforce behavioral guidelines and workflows for coding agents like Claude Code, Cursor, and Windsurf.

### Core Value Proposition

Enable developers to create specialized coding agents with:

- **Deterministic workflows** (analyze → read tests → implement → verify → commit)
- **Behavioral guardrails** (TDD enforcement, verification requirements, security checks)
- **Role-based tool restrictions** (backend devs can't use Playwright, QA can't modify code)
- **Memory/session context handling** (automatic continuity across sessions)
- **Runtime enforcement** via hooks (proactive validation before tool execution)

---

## System Architecture

### Three-Tier Agent Scoping

**System Agents** (Platform-provided templates)

- Created by Gabby platform team
- Available to all clients/users
- Examples: backend-dev, frontend-dev, qa, researcher
- Read-only for end users

**Client Agents** (Organization-level templates)

- Created by client admins
- Available to all users in that organization
- Can inherit from system templates with customizations

**User Agents** (Personal templates)

- Created by individual users
- Private to that user
- Can inherit from system or client templates

**Lookup Priority**: User → Client → System (first active match wins)

### Component Stack

```
┌─────────────────────────────────────────────────────────┐
│  Coding Agent (Claude Code, Cursor, Windsurf, etc.)   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   gobby_client       │ ◄── Local daemon
          │   (Python)           │ ◄── Hook integration
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   MCP Protocol       │
          │   (WebSocket/HTTP)   │
          └──────────┬───────────┘
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼                             ▼
┌──────────────┐           ┌──────────────┐
│ gobby-agents │           │ gobby-memory │
│ MCP Server   │           │ MCP Server   │
└──────┬───────┘           └──────┬───────┘
       │                          │
       └──────────┬───────────────┘
                  │
                  ▼
       ┌──────────────────┐
       │ Supabase         │
       │ (PostgreSQL)     │
       └──────────────────┘
```

---

## Database Schema (Core Tables)

### Agent Templates

**`agents`** (System-level templates)

- Identity: `role`, `name`, `icon`, `description`, `version`
- Config: `default_model`, `system_prompt`
- JSONB fields: `workflow_steps`, `guidelines`, `mcp_servers`, `tool_permissions`

**`client_agents`** (Client-scoped templates)

- Same structure as `agents`
- Additional: `client_id`, `based_on_agent_id` (optional inheritance)

**`user_agents`** (User-scoped templates)

- Same structure as `agents`
- Additional: `user_id`, `client_id`, `based_on_agent_id`, `based_on_client_agent_id`

### Agent Instances

**`agent_instances`** (Session-scoped execution)

- Template reference: One of `agent_id`, `client_agent_id`, `user_agent_id`
- Session binding: `session_id`, `user_id`, `client_id`
- Execution state: `status` (running/completed/failed/terminated)
- Config snapshot: `config_snapshot` JSONB (frozen at instantiation)
- Runtime state: `current_step_id`, `step_history`, `variables`
- Timestamps: `started_at`, `completed_at`

**Key Design**: No lifecycle field - agents always tied to Claude Code sessions. Context continuity handled by gobby-memory checkpoints.

### Behavioral Guidelines

**`agent_guidelines`** (Runtime enforcement rules)

- Identity: `guideline_id`, `priority` (1-10)
- Condition/Action: `condition_text`, `action_text` (natural language)
- Structured: `expectation`, `anti_example`, `violation_detection`
- Evaluation hooks: `evaluation_hooks` JSONB (runtime validation config)
- Retry config: `max_retries`, `retry_strategy`, `escalation_path`
- Memory integration: `on_violation_record`, `on_user_interrupt`
- Tool requirements: `required_tools` array, `violation_type`

### Workflow Steps

**`workflow_steps`** (Ordered execution sequence)

- Definition: `step_id`, `step_name`, `step_type` (execution/meta_mentor_review/conditional/loop/subagent)
- Configuration: `tools` array (allowed tools), `required` boolean
- Conditional logic: `condition` JSONB, `next_steps` JSONB
- Output: `output_variables` array
- Ordering: `sequence_order` INT

### MCP Server Configurations

**`mcp_servers`** (Required integrations)

- Identity: `server_name` (gobby-memory, context7, serena, etc.)
- Criticality: `criticality` (required/preferred/optional)
- Configuration: `transport` (websocket/http/stdio), `url`, `command`, `args`
- Fallback: `fallback_config` JSONB
- Health: `health_check_enabled`, `health_check_interval`

---

## Agent Template Structure

### YAML Format

```yaml
agent:
  # Identity
  role: backend-dev
  name: Backend Developer
  icon: 🔧
  description: Specialized backend development agent (Python/FastAPI)

  # Model Configuration
  default_model: claude-sonnet-4-20250514

  # System Prompt
  system_prompt: |
    You are a backend development specialist. You write clean, tested,
    asynchronous Python code following TDD principles.

  # Workflow Steps
  workflow_steps:
    - id: analyze_task
      name: Analyze Task Requirements
      type: execution
      tools: [Read, mcp__serena__find_symbol]

    - id: read_tests
      name: Read Test Files
      type: execution
      tools: [Read, Grep]
      required: true

    - id: implement_code
      name: Implement Solution
      type: execution
      tools: [Edit, Write]

  # Behavioral Guidelines
  guidelines:
    - id: tdd-read-tests-first
      priority: 1
      condition: Starting implementation of a new feature or bug fix
      action: MUST read test files BEFORE writing implementation code

      expectation: |
        1. Use Grep to find test files
        2. Read relevant tests
        3. Write new tests FIRST
        4. Then implement to pass tests

      evaluation_hooks:
        - hook: pre-tool-use
          trigger_when:
            tool_pattern: "Edit|Write"
            file_pattern: "(?!.*test).*\\.py$"

          evaluator: claude-agent-sdk
          evaluation_prompt: |
            Check conversation history: Did agent read test files
            in last 5 tool uses? Return JSON with pass/fail.

          on_failure:
            action: block
            message: Must read test files before modifying implementation

      max_retries: 3
      retry_strategy: progressive_guidance
      violation_type: functional

  # MCP Server Requirements
  mcp_servers:
    gobby-memory:
      required: true
      criticality: required
      transport: websocket

    context7:
      required: false
      criticality: preferred
      transport: http
      fallback:
        type: built-in
        tool: WebSearch

  # Tool Permissions
  tool_permissions:
    allowed:
      - Read
      - Edit
      - Write
      - Bash
      - mcp__serena__*
      - mcp__context7__*
    disallowed:
      - mcp__playwright__*
```

---

## Key Features

### 1. Behavioral Guidelines with Runtime Enforcement

**Condition → Action → Evaluation Pattern**

Guidelines use natural language conditions evaluated by LLM (Claude Agent SDK - FREE with subscription):

```yaml
- id: tdd-read-tests-first
  priority: 1
  condition: "Starting implementation of a new feature or bug fix"
  action: "MUST read test files BEFORE writing implementation code"

  evaluation_hooks:
    - hook: pre-tool-use # Evaluate BEFORE agent executes tool
      trigger_when:
        tool_pattern: "Edit|Write"
        file_pattern: "(?!.*test).*\\.py$"

      evaluator: claude-agent-sdk
      evaluation_prompt: |
        Check if agent read test files in last 5 tool uses.
        Return JSON: {pass: true/false, reason: "...", corrective_action: "..."}

      on_failure:
        action: block # Prevent tool execution
        message: "Must read test files first"
```

**Enforcement Flow**:

1. Agent plans action (e.g., Edit implementation.py)
2. PRE-TOOL-USE hook triggered
3. Claude Agent SDK evaluates behavior against guidelines
4. If violation → Block execution + inject corrective feedback
5. Agent retries with guidance (progressive escalation)
6. Violation recorded to memory for learning

### 2. Workflow Engine

**Five Step Types**:

- **execution**: Standard code execution with allowed tools
- **meta_mentor_review**: Claude Agent SDK evaluation of plans/code
- **conditional**: Branch based on runtime state
- **loop**: Iterate until condition met (e.g., all tests passing)
- **subagent**: Spawn specialized agent for subtask

**Example Meta Mentor Review**:

```yaml
- id: review_plan
  name: Review Implementation Plan
  type: meta_mentor_review
  evaluation_prompt: |
    Review the agent's implementation plan:
    1. Is the approach sound?
    2. Are edge cases considered?
    3. Is the scope appropriate?
    Return JSON with pass/fail and suggestions.
  on_failure:
    action: block
    feedback: "Plan needs refinement"
```

### 3. Memory Integration (Trae-Style Context Management)

**Automatic Context Recording**:

- Session checkpoints saved automatically (pre-compact, session-end hooks)
- Violations recorded with full context (what, why, retry history)
- User corrections captured as high-priority feedback
- Pattern analysis across sessions

**Context Restoration**:

- Session-start hook auto-restores compressed context (~2000 tokens)
- No manual queries - system injects working memory automatically
- Cross-session continuity transparent to user

**Example Violation Recording**:

```yaml
on_violation_record:
  memory_entity_types: [Violation, Lesson, Procedure]
  record_context: |
    - What file was about to be modified
    - Why it violated TDD workflow
    - Which tests should have been read first
    - Retry attempt number and outcome
  session_id: true
  trajectory_link: true
```

### 4. MCP Server Integration

**Criticality-Based Health Model**:

- **Required**: Agent stops execution if server unavailable (e.g., gobby-memory)
- **Preferred**: Try primary, fallback to alternative (e.g., firecrawl → WebFetch)
- **Optional**: Use if available, skip if not (e.g., specialized tools)

**Tool Namespacing**:

- Built-in tools: `Read`, `Edit`, `Write`, `Bash` (capitalized)
- MCP tools: `mcp__server__tool` (e.g., `mcp__context7__get-library-docs`)

### 5. Requirements Elicitation

**Guided Agent Creation** (14-question flow):

1. Agent role and purpose
2. Primary workflow steps
3. Model selection
4. Behavioral guidelines (TDD, verification, etc.)
5. Tool permissions
6. MCP server requirements
7. Memory recording strategy
8. ...and more

**Meta-Agent**: `agent-builder.yaml` demonstrates using gobby-agents MCP tools to help users create custom agents interactively.

---

## MCP Tools (gobby-agents Service)

### Agent Template Management (6 tools)

- `fetch_agent` - Retrieve template by identifier (UUID/role/name)
- `list_agents` - List available templates with filtering
- `create_user_agent` - Create user-scoped agent
- `update_user_agent` - Update existing user agent
- `delete_user_agent` - Delete user agent
- `copy_agent_to_user` - Copy system/client agent to user scope

### Agent Instance Management (5 tools)

- `create_agent_instance` - Create instance for session
- `get_agent_instance` - Get instance by ID
- `list_agent_instances` - List user's instances
- `update_instance_status` - Update execution status
- `terminate_agent_instance` - Terminate running instance

### Requirements Elicitation (2 tools)

- `elicit_agent_requirements` - Interactive question flow
- `generate_agent_from_requirements` - Generate YAML from answers

### Hook Management (2 tools)

- `fetch_hooks` - Get hook implementations
- `list_hooks` - List available hooks

### Resources (3)

- `agents://status` - Service health and stats
- `agents://scopes` - Available scopes and priority
- `agents://template-schema` - Agent YAML JSON schema

---

## Integration Patterns

### gobby_client Hook Flow

**Session Start**:

```python
async def on_session_start(session_id: str):
    # Determine agent role (from task assignment)
    role = await get_task_agent_role() or 'backend-dev'

    # Create instance via MCP
    instance = await mcp_call(
        'gobby-agents', 'create_agent_instance',
        session_id=session_id, role=role
    )

    # Store in session context
    session.agent = instance
    session.guidelines = instance.config_snapshot['guidelines']
```

**Pre-Tool-Use Enforcement**:

```python
async def on_pre_tool_use(tool_name: str, tool_args: dict):
    # Load guidelines for current agent
    guidelines = session.agent.config_snapshot['guidelines']

    # Execute evaluation hooks
    hook_handler = EvaluationHookHandler(guidelines)
    result = await hook_handler.execute_pre_tool_hooks(tool_name, tool_args)

    if result['action'] == 'block':
        raise ToolBlockedException(
            message=result['feedback'],
            corrective_action=result.get('corrective_action')
        )
```

**Session End**:

```python
async def on_session_end():
    # Update instance status
    await mcp_call('gobby-agents', 'complete_instance',
                   instance_id=session.agent.id)

    # Save checkpoint to memory
    await mcp_call('gobby-memory', 'add_episode',
                   name=f"Session completed: {session.agent.role}",
                   episode_body=session.conversation_history,
                   entity_types=['Context'],
                   session_id=session.id)
```

---

## Goals of the Project

### Primary Goals

1. **Deterministic Agent Behavior**
   - Developers can define exact workflows agents must follow
   - Eliminate "creative" deviations from TDD, verification practices
   - Enforce organizational coding standards programmatically

2. **Runtime Behavioral Enforcement**
   - Proactive validation BEFORE actions taken (not post-hoc review)
   - Block violating actions with corrective guidance
   - Progressive escalation (warn → guide → block → require user intervention)

3. **Learning from Mistakes**
   - Violations recorded to memory with full context
   - Pattern analysis identifies recurring issues
   - User corrections captured as high-priority feedback
   - Future agents benefit from historical lessons

4. **Role-Based Specialization**
   - Backend devs can't use browser automation tools
   - QA agents can't modify implementation code
   - Researchers limited to Read/Search tools only
   - Each role has tailored workflows and permissions

5. **Organizational Knowledge Capture**
   - System templates: Platform best practices
   - Client templates: Organization-specific standards
   - User templates: Personal workflow preferences
   - Three-tier hierarchy with inheritance

### Secondary Goals

6. **Session Continuity Without Manual Effort**
   - Automatic checkpoint saving (pre-compact, session-end)
   - Automatic context restoration (session-start)
   - No manual memory queries - transparent to user

7. **MCP Server Health Management**
   - Required servers must be available (block execution if down)
   - Preferred servers fallback gracefully
   - Optional servers skipped if unavailable

8. **Interactive Agent Creation**
   - Guided requirements elicitation (14 questions)
   - Generate complete YAML from answers
   - Validate against schema before creation

---

## Technical Decisions

### Why Session-Scoped Instances?

**Decision**: No lifecycle field - agents always tied to Claude Code sessions

**Rationale**:

- Simpler mental model (one session = one instance)
- Context continuity handled by gobby-memory checkpoints
- Eliminates resume/pause complexity
- Background tasks handled by separate system (not agent instances)

### Why Natural Language Conditions?

**Decision**: Guidelines use natural language conditions evaluated by LLM

**Rationale**:

- Flexible - express complex conditions without formal grammar
- Modern LLMs excel at understanding intent from natural language
- Maintainable - easier to write and understand than DSL
- Extensible - new condition types don't require parser updates
- Free evaluation via Claude Agent SDK (included with Claude subscription)

### Why CLI-Agnostic Templates?

**Decision**: Agent templates work across all CLIs (Claude Code, Cursor, etc.)

**Rationale**:

- Single template works everywhere
- CLI-specific behavior handled by hooks (not templates)
- Users don't need separate templates per CLI
- Future CLI support requires adding hooks, not migrating templates

### Why JSONB Storage?

**Decision**: Workflow steps, guidelines, MCP servers stored as JSONB

**Rationale**:

- Atomic units rendered to YAML
- Simpler schema (avoids many joins)
- Flexible structure (easy to add fields)
- GIN indexes enable fast JSONB queries when needed

---

## Current Status

**Phase**: Requirements Elicitation Complete (14/14 questions answered)

**Deliverables**:

- ✅ Requirements elicitation document
- ✅ Complete database schema
- ✅ MCP tools specification
- ✅ Example agent templates
- ✅ Meta-agent (agent-builder.yaml)
- ✅ Architecture specification

**Next Steps**:

1. Implement FastMCP server (gobby-agents)
2. Create RLS policies for agent tables
3. Implement API endpoints (REST/WebSocket)
4. Build agent YAML validator
5. Create database migration files
6. Integration tests with gobby-memory
7. Documentation for end users

---

## Key Files

- `/gobby-agents-specification.md` - Complete architecture specification
- `/requirements-elicitation.md` - 14-question requirements gathering process
- `/examples/agent-builder.yaml` - Meta-agent for agent creation
- `/examples/*.yaml` - System agent template examples
- `/schema-draft-v1.sql` - Database schema (PostgreSQL)
- `/mcp-tools.md` - Complete MCP tools reference

---

## Example Use Case

**Scenario**: Company wants all backend developers to follow strict TDD workflow

**Solution**:

1. Client admin creates `client_agents` template:
   - Based on system `backend-dev` template
   - Adds company-specific guidelines:
     - Must use pytest (not unittest)
     - All tables use `company_schema` prefix
     - Run linter before commit
   - Restricts tools: No browser automation, no file deletion

2. Developer starts Claude Code session:
   - gobby_client creates agent instance (automatic)
   - Instance uses client's `backend-dev-custom` template
   - Guidelines enforced via pre-tool-use hooks

3. Developer tries to edit code before reading tests:
   - PRE-TOOL-USE hook triggered
   - Claude Agent SDK evaluates: "Did agent read tests?"
   - Evaluation fails → Tool execution BLOCKED
   - Feedback injected: "Must read test files first. Use Grep to find tests."
   - Developer reads tests → Hook passes → Implementation allowed

4. Developer runs tests, some fail:
   - POST-TOOL-USE hook triggered
   - Evaluates: "Does agent understand failure?"
   - If agent tries to immediately fix without analysis → Warn + guidance
   - Violation recorded to memory for learning

5. Session ends:
   - Instance marked complete
   - Checkpoint saved to memory
   - Next session automatically restores context

**Result**: Consistent TDD workflow enforced across team with automatic guidance and learning.

---

## Summary

Gabby AI is a **behavioral enforcement platform** for coding agents. It transforms vague "best practices" into deterministic, enforceable workflows that agents cannot bypass. Through runtime evaluation, memory integration, and progressive guidance, it creates a learning system where both agents and developers improve over time.

**Core Innovation**: Moving from "hope the agent does the right thing" to "guarantee the agent follows the workflow" through proactive LLM-based validation (FREE via Claude Agent SDK).
