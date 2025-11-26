/**
 * Chat UI types aligned with agent-cli-sdk StreamEvent format
 * Based on Anthropic's Claude API message structure
 */

// Re-export Claude CLI session types
export type {
  ClaudeSessionRow,
  ClaudeSessionData,
  ClaudeFileHistorySnapshotRow,
  ClaudeUserMessageRow,
  ClaudeAssistantMessageRow,
  ClaudeMessage,
  ClaudeContentBlock,
  ClaudeFileBackup,
  ClaudeFileHistorySnapshot,
  ClaudeThinkingMetadata,
  ClaudeToolUseResult,
} from './claude-session.types';

export {
  isFileHistorySnapshot,
  isUserMessage,
  isAssistantMessage,
} from './claude-session.types';

/**
 * Re-export message types from message.types to maintain backwards compatibility
 * This avoids duplicate type definitions
 */
export type {
  UIMessage,
  EnrichedToolUseBlock,
  UnifiedMessage,
  UnifiedContent,
  UnifiedTextBlock,
  UnifiedThinkingBlock,
  UnifiedToolUseBlock,
  UnifiedToolResultBlock,
  UnifiedSlashCommandBlock,
} from './message.types';

/**
 * Tool call with linked result (for rendering)
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

/**
 * Re-export tool types from tool.types to maintain backwards compatibility
 */
export type {
  EditToolInput,
  WriteToolInput,
  ReadToolInput,
  BashToolInput,
  GlobToolInput,
  GrepToolInput,
} from './tool.types';
