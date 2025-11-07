/**
 * Parses Codex JSONL events into UnifiedMessage format.
 *
 * Codex outputs TWO DIFFERENT FORMATS:
 *
 * 1. STREAMING FORMAT (item.completed)
 *    - Output during CLI execution with --json flag
 *    - Used by execute() function for real-time message streaming
 *
 * 2. PERSISTED FORMAT (response_item, event_msg)
 *    - Saved in session files (~/.codex/sessions/YYYY/MM/DD/*.jsonl)
 *    - Used by loadSession() function for loading message history
 *
 * Both formats are transformed into Claude-compatible unified format.
 */

import type { UnifiedMessage, UnifiedContent, UnifiedToolUseBlock } from '../types/unified';
import type {
  CodexEvent,
  ItemCompletedEvent,
  ReasoningItem,
  AgentMessageItem,
  CommandExecutionItem,
  FileChangeItem,
  ResponseItemEvent,
  EventMessageEvent,
} from './types';

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a single JSONL line from Codex CLI into UnifiedMessage format.
 *
 * Handles both streaming format (item.completed) and persisted format
 * (response_item, event_msg) transparently.
 *
 * @param jsonlLine - Raw JSONL string from Codex CLI or session file
 * @returns UnifiedMessage if parseable, null for metadata/unparseable events
 */
export function parse(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: CodexEvent = JSON.parse(jsonlLine);

    // ============================================================================
    // STREAMING FORMAT - item.completed
    // ============================================================================
    // These events stream during CLI execution (execute() function)
    if (event.type === 'item.completed') {
      return transformItemCompleted(event);
    }

    // ============================================================================
    // PERSISTED FORMAT - response_item
    // ============================================================================
    // These events are saved in session files (loadSession() function)
    // Contains: messages, reasoning, function_call, function_call_output
    if (event.type === 'response_item') {
      return transformResponseItem(event);
    }

    // ============================================================================
    // PERSISTED FORMAT - event_msg
    // ============================================================================
    // Supplementary events in session files
    // Contains: agent_message, agent_reasoning, user_message, token_count
    if (event.type === 'event_msg') {
      return transformEventMessage(event);
    }

    // ============================================================================
    // METADATA EVENTS (not parsed into messages)
    // ============================================================================
    // - session_meta: Session initialization metadata
    // - turn_context: Turn configuration metadata
    // - thread.started, turn.started, turn.completed: Control flow events
    return null;
  } catch {
    // Silently skip invalid events
    return null;
  }
}

// ============================================================================
// STREAMING FORMAT TRANSFORMERS
// ============================================================================

function transformItemCompleted(event: ItemCompletedEvent): UnifiedMessage | null {
  const { item } = event;

  switch (item.type) {
    case 'reasoning':
      return transformReasoning(event, item);
    case 'agent_message':
      return transformAgentMessage(event, item);
    case 'command_execution':
      return transformCommandExecution(event, item);
    case 'file_change':
      return transformFileChange(event, item);
    default: {
      // Exhaustive check
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

function transformReasoning(event: ItemCompletedEvent, item: ReasoningItem): UnifiedMessage {
  const content: UnifiedContent[] = [
    {
      type: 'thinking',
      thinking: item.text,
    },
  ];

  return {
    id: item.id,
    role: 'assistant',
    content,
    timestamp: Date.now(), // Codex doesn't provide timestamps in these events
    tool: 'codex',
    _original: event,
  };
}

function transformAgentMessage(event: ItemCompletedEvent, item: AgentMessageItem): UnifiedMessage {
  const content: UnifiedContent[] = [
    {
      type: 'text',
      text: item.text,
    },
  ];

  return {
    id: item.id,
    role: 'assistant',
    content,
    timestamp: Date.now(),
    tool: 'codex',
    _original: event,
  };
}

function transformCommandExecution(event: ItemCompletedEvent, item: CommandExecutionItem): UnifiedMessage {
  // Tool use for the command execution
  const toolUseContent: UnifiedContent = {
    type: 'tool_use',
    id: item.id,
    name: 'Bash',
    input: {
      command: item.command,
    },
  };

  // Tool result with the output
  const toolResultContent: UnifiedContent = {
    type: 'tool_result',
    tool_use_id: item.id,
    content: item.aggregated_output || '',
    is_error: item.exit_code !== 0,
  };

  // Return message with both tool use and result
  return {
    id: item.id,
    role: 'assistant',
    content: [toolUseContent, toolResultContent],
    timestamp: Date.now(),
    tool: 'codex',
    _original: event,
  };
}

function transformFileChange(event: ItemCompletedEvent, item: FileChangeItem): UnifiedMessage {
  // Map file changes to tool uses
  const changes: UnifiedContent[] = item.changes.map((change) => {
    switch (change.kind) {
      case 'add':
        return {
          type: 'tool_use' as const,
          id: `${item.id}_add_${simpleHash(change.path)}`,
          name: 'Write',
          input: {
            file_path: change.path,
          },
        } satisfies UnifiedToolUseBlock;
      case 'modify':
        return {
          type: 'tool_use' as const,
          id: `${item.id}_edit_${simpleHash(change.path)}`,
          name: 'Edit',
          input: {
            file_path: change.path,
          },
        } satisfies UnifiedToolUseBlock;
      case 'delete':
        return {
          type: 'tool_use' as const,
          id: `${item.id}_delete_${simpleHash(change.path)}`,
          name: 'Bash',
          input: {
            command: `rm ${change.path}`,
          },
        } satisfies UnifiedToolUseBlock;
      default: {
        const _exhaustive: never = change.kind;
        return _exhaustive;
      }
    }
  });

  return {
    id: item.id,
    role: 'assistant',
    content: changes,
    timestamp: Date.now(),
    tool: 'codex',
    _original: event,
  };
}

// ============================================================================
// PERSISTED FORMAT TRANSFORMERS - response_item
// ============================================================================

function transformResponseItem(event: ResponseItemEvent): UnifiedMessage | null {
  const { payload, timestamp } = event;

  // Messages (user/assistant text)
  if (payload.type === 'message') {
    const content: UnifiedContent[] = payload.content.map((item) => ({
      type: 'text' as const,
      text: item.text,
    }));

    return {
      id: generateId(timestamp),
      role: payload.role,
      content,
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Reasoning (thinking blocks)
  if (payload.type === 'reasoning') {
    const thinkingText = payload.summary.map((s) => s.text).join('\n');

    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [{ type: 'thinking', thinking: thinkingText }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Function calls (tool_use) - TRANSFORM TO CLAUDE FORMAT
  if (payload.type === 'function_call') {
    // Parse arguments JSON string
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(payload.arguments);
    } catch {
      parsedArgs = { raw: payload.arguments };
    }

    // Transform Codex tool names to Claude tool names
    const claudeToolName = mapCodexToolToClaude(payload.name);

    // Transform input structure based on tool
    const input = transformToolInput(payload.name, parsedArgs);

    return {
      id: payload.call_id,
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: payload.call_id,
          name: claudeToolName,
          input,
        },
      ],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Function outputs (tool_result) - EXTRACT FROM JSON WRAPPER
  if (payload.type === 'function_call_output') {
    // Parse output JSON string: {"output": "...", "metadata": {...}}
    let actualOutput: string;
    let exitCode = 0;

    try {
      const parsed = JSON.parse(payload.output);
      actualOutput = parsed.output || payload.output;
      exitCode = parsed.metadata?.exit_code ?? 0;
    } catch {
      // If not JSON, use raw output
      actualOutput = payload.output;
    }

    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [
        {
          type: 'tool_result',
          tool_use_id: payload.call_id,
          content: actualOutput,
          is_error: exitCode !== 0,
        },
      ],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  return null;
}

// ============================================================================
// PERSISTED FORMAT TRANSFORMERS - event_msg
// ============================================================================

function transformEventMessage(event: EventMessageEvent): UnifiedMessage | null {
  const { payload, timestamp } = event;

  // Agent messages (assistant text)
  if (payload.type === 'agent_message') {
    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [{ type: 'text', text: payload.message }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Agent reasoning (thinking summaries)
  if (payload.type === 'agent_reasoning') {
    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [{ type: 'thinking', thinking: payload.text }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // User messages
  if (payload.type === 'user_message') {
    return {
      id: generateId(timestamp),
      role: 'user',
      content: [{ type: 'text', text: payload.message }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Ignore: token_count (metadata only)
  return null;
}

// ============================================================================
// TOOL TRANSFORMATION HELPERS
// ============================================================================

/**
 * Map Codex tool names to Claude tool names
 */
function mapCodexToolToClaude(codexToolName: string): string {
  const mapping: Record<string, string> = {
    shell: 'Bash',
    // Add more mappings as discovered:
    // read_file: 'Read',
    // write_file: 'Write',
    // edit_file: 'Edit',
  };

  return mapping[codexToolName] || codexToolName;
}

/**
 * Transform Codex tool input to Claude tool input format
 */
function transformToolInput(codexToolName: string, codexInput: Record<string, unknown>): Record<string, unknown> {
  // Shell/Bash transformation
  if (codexToolName === 'shell') {
    // Codex format: {"command": ["zsh", "-lc", "ls"], "workdir": ".", "timeout_ms": 120000}
    // Claude format: {"command": "ls"}

    const command = codexInput.command;

    if (Array.isArray(command)) {
      // Extract actual command from array format
      // ["zsh", "-lc", "ls"] → "ls"
      const actualCommand = command[command.length - 1];
      return { command: actualCommand };
    }

    return { command: String(command) };
  }

  // Default: pass through
  return codexInput;
}

/**
 * Generate stable ID from timestamp
 */
function generateId(timestamp: string): string {
  const hash = simpleHash(timestamp + Math.random());
  return `msg_${hash}`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple hash function for generating IDs.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
