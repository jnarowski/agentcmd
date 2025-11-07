/**
 * Codex-specific types for parsing JSONL events.
 *
 * These types are INPUT-ONLY - they are used to parse incoming JSONL from Codex CLI
 * and type the `_original` field. All output should use UnifiedMessage types from types/unified.ts.
 */

// ============================================================================
// Top-Level Event Structure
// ============================================================================

export type CodexEvent =
  // Streaming format (item.completed)
  | ThreadStartedEvent
  | TurnStartedEvent
  | TurnCompletedEvent
  | TurnFailedEvent
  | ItemStartedEvent
  | ItemCompletedEvent
  | ErrorEvent
  // Persisted format (response_item, event_msg)
  | ResponseItemEvent
  | EventMessageEvent
  | SessionMetaEvent
  | TurnContextEvent;

export interface ThreadStartedEvent {
  type: 'thread.started';
  thread_id: string;
}

export interface TurnStartedEvent {
  type: 'turn.started';
}

export interface TurnCompletedEvent {
  type: 'turn.completed';
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
}

export interface TurnFailedEvent {
  type: 'turn.failed';
  error: {
    message: string;
  };
}

export interface ItemStartedEvent {
  type: 'item.started';
  item: CodexItem;
}

export interface ItemCompletedEvent {
  type: 'item.completed';
  item: CodexItem;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

export type CodexItem = ReasoningItem | AgentMessageItem | CommandExecutionItem | FileChangeItem;

export interface ReasoningItem {
  id: string;
  type: 'reasoning';
  text: string;
}

export interface AgentMessageItem {
  id: string;
  type: 'agent_message';
  text: string;
}

export interface CommandExecutionItem {
  id: string;
  type: 'command_execution';
  command: string;
  aggregated_output: string;
  exit_code?: number;
  status: 'in_progress' | 'completed' | 'failed';
}

export interface FileChangeItem {
  id: string;
  type: 'file_change';
  changes: Array<{
    path: string;
    kind: 'add' | 'modify' | 'delete';
  }>;
  status: 'in_progress' | 'completed' | 'failed';
}

// ============================================================================
// Persisted Format - response_item events
// ============================================================================
// These events are saved in session files (~/.codex/sessions/YYYY/MM/DD/*.jsonl)

export interface ResponseItemEvent {
  timestamp: string;
  type: 'response_item';
  payload: ResponseItemPayload;
}

export type ResponseItemPayload =
  | ResponseItemMessage
  | ResponseItemReasoning
  | ResponseItemFunctionCall
  | ResponseItemFunctionCallOutput;

export interface ResponseItemMessage {
  type: 'message';
  role: 'user' | 'assistant';
  content: Array<{
    type: 'input_text' | 'output_text';
    text: string;
  }>;
}

export interface ResponseItemReasoning {
  type: 'reasoning';
  summary: Array<{
    type: 'summary_text';
    text: string;
  }>;
  content: null;
  encrypted_content: string;
}

export interface ResponseItemFunctionCall {
  type: 'function_call';
  name: string;
  arguments: string; // JSON string
  call_id: string;
}

export interface ResponseItemFunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string; // JSON string: {output, metadata}
}

// ============================================================================
// Persisted Format - event_msg events
// ============================================================================
// Supplementary events in session files

export interface EventMessageEvent {
  timestamp: string;
  type: 'event_msg';
  payload: EventMessagePayload;
}

export type EventMessagePayload =
  | { type: 'agent_message'; message: string }
  | { type: 'agent_reasoning'; text: string }
  | { type: 'user_message'; message: string; kind: string }
  | { type: 'token_count'; info: unknown; rate_limits: unknown };

// ============================================================================
// Persisted Format - Metadata events
// ============================================================================
// These events are ignored during parsing (return null)

export interface SessionMetaEvent {
  timestamp: string;
  type: 'session_meta';
  payload: {
    id: string;
    timestamp: string;
    cwd: string;
    originator: string;
    cli_version: string;
    instructions: string | null;
    git?: {
      commit_hash: string;
      branch: string;
      repository_url: string;
    };
  };
}

export interface TurnContextEvent {
  timestamp: string;
  type: 'turn_context';
  payload: {
    cwd: string;
    approval_policy: string;
    sandbox_policy: { mode: string };
    model: string;
    effort: string;
    summary: string;
  };
}
