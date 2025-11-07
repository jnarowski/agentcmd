/**
 * Parses Gemini messages into UnifiedMessage format.
 *
 * Gemini stores sessions as complete JSON objects (not streaming JSONL).
 * This parser transforms Gemini's format to Claude-compatible unified format:
 *
 * - Gemini tool names → Claude tool names (e.g., `read_file` → `Read`)
 * - Gemini thoughts → Claude `thinking` blocks
 * - Gemini tool calls with embedded results → Separate `tool_use` and `tool_result` blocks
 * - Original Gemini data preserved in `_original` field
 *
 * This ensures the frontend **only needs to support one format** (Claude's).
 */

import type { UnifiedMessage, UnifiedContent } from '../types/unified';
import type { GeminiMessage } from './types';

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a single Gemini message into UnifiedMessage format.
 *
 * Transforms Gemini's format to match Claude's structure, preserving original
 * data in `_original` field for debugging.
 *
 * @param geminiMessage - Gemini message from session file
 * @returns UnifiedMessage in Claude-compatible format
 */
export function parse(geminiMessage: GeminiMessage): UnifiedMessage {
  const content: UnifiedContent[] = [];

  // ============================================================================
  // 1. Transform thoughts → thinking blocks (first)
  // ============================================================================
  if (geminiMessage.thoughts && geminiMessage.thoughts.length > 0) {
    for (const thought of geminiMessage.thoughts) {
      content.push({
        type: 'thinking',
        thinking: `${thought.subject}: ${thought.description}`,
      });
    }
  }

  // ============================================================================
  // 2. Transform toolCalls → tool_use + tool_result blocks
  // ============================================================================
  if (geminiMessage.toolCalls && geminiMessage.toolCalls.length > 0) {
    for (const toolCall of geminiMessage.toolCalls) {
      // Tool use block
      const claudeToolName = mapGeminiToolToClaude(toolCall.name);
      const claudeInput = transformToolInput(toolCall.name, toolCall.args);

      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: claudeToolName,
        input: claudeInput,
      });

      // Tool result block (if present)
      if (toolCall.result && toolCall.result.length > 0) {
        const response = toolCall.result[0]?.functionResponse.response;
        const resultContent = response?.output || response?.error || '';
        const isError = toolCall.status === 'error' || !!response?.error;

        content.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: resultContent,
          is_error: isError,
        });
      }
    }
  }

  // ============================================================================
  // 3. Add text content (last)
  // ============================================================================
  if (geminiMessage.content && geminiMessage.content.trim()) {
    content.push({
      type: 'text',
      text: geminiMessage.content,
    });
  }

  // ============================================================================
  // 4. Build unified message (Claude format)
  // ============================================================================
  return {
    id: geminiMessage.id,
    role: geminiMessage.type === 'user' ? 'user' : 'assistant',
    content: content.length > 0 ? content : geminiMessage.content,
    timestamp: new Date(geminiMessage.timestamp).getTime(),
    tool: 'gemini',
    model: geminiMessage.model,
    usage: geminiMessage.tokens
      ? {
          inputTokens: geminiMessage.tokens.input,
          outputTokens: geminiMessage.tokens.output,
          totalTokens: geminiMessage.tokens.total,
          cacheReadTokens: geminiMessage.tokens.cached,
        }
      : undefined,
    _original: geminiMessage,
  };
}

// ============================================================================
// Tool Transformation Helpers
// ============================================================================

/**
 * Map Gemini tool names to Claude tool names
 */
function mapGeminiToolToClaude(geminiToolName: string): string {
  const mapping: Record<string, string> = {
    read_file: 'Read',
    write_file: 'Write',
    replace: 'Edit',
    list_directory: 'Glob',
    run_shell_command: 'Bash',
    google_web_search: 'WebSearch', // Gemini-specific
  };

  return mapping[geminiToolName] || geminiToolName;
}

/**
 * Transform Gemini tool input to Claude tool input format
 */
function transformToolInput(geminiToolName: string, geminiArgs: Record<string, unknown>): Record<string, unknown> {
  // Read file
  if (geminiToolName === 'read_file') {
    return {
      file_path: geminiArgs.absolute_path || geminiArgs.file_path,
    };
  }

  // Write file
  if (geminiToolName === 'write_file') {
    return {
      file_path: geminiArgs.file_path,
      content: geminiArgs.content,
    };
  }

  // Replace (edit)
  if (geminiToolName === 'replace') {
    return {
      file_path: geminiArgs.file_path,
      old_string: geminiArgs.old_string,
      new_string: geminiArgs.new_string,
      // Omit 'instruction' field that Gemini may include
    };
  }

  // List directory
  if (geminiToolName === 'list_directory') {
    return {
      pattern: '*',
      path: geminiArgs.path,
    };
  }

  // Shell command
  if (geminiToolName === 'run_shell_command') {
    return {
      command: geminiArgs.command,
      description: geminiArgs.description,
    };
  }

  // Web search - pass through
  if (geminiToolName === 'google_web_search') {
    return geminiArgs;
  }

  // Default: pass through
  return geminiArgs;
}
