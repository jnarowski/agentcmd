/**
 * Message Types
 *
 * Re-exports SDK types as primary types with minimal UI extensions.
 * SDK types are the single source of truth for message structure.
 */

// Re-export SDK types as primary types
export type {
  UnifiedMessage,
  UnifiedContent,
  UnifiedTextBlock,
  UnifiedThinkingBlock,
  UnifiedToolUseBlock,
  UnifiedToolResultBlock,
  UnifiedSlashCommandBlock
} from 'agent-cli-sdk';

// Single UI extension for streaming state
import type { UnifiedMessage, UnifiedToolUseBlock } from 'agent-cli-sdk';

export type UIMessage = Omit<UnifiedMessage, 'tool'> & {
  tool?: UnifiedMessage['tool']; // Make tool optional for UI messages
  isStreaming?: boolean;
  _original?: unknown; // Direct pass-through from SDK (not nested UnifiedMessage)
  isError?: boolean; // Flag for error messages
  images?: string[]; // Legacy support for images array (deprecated, use content blocks)
  parentId?: string | null; // Flattened from _original.parentUuid
  sessionId?: string; // Flattened from _original.sessionId
};

// Extended tool block with nested result
export type EnrichedToolUseBlock = UnifiedToolUseBlock & {
  result?: {
    content: string;
    is_error?: boolean;
  };
};
