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
  _original?: UnifiedMessage; // Original message before enrichment (for debugging)
  isError?: boolean; // Flag for error messages
  images?: string[]; // Legacy support for images array (deprecated, use content blocks)
};

// Extended tool block with nested result
export type EnrichedToolUseBlock = UnifiedToolUseBlock & {
  result?: {
    content: string;
    is_error?: boolean;
  };
};
