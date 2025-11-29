import type { UnifiedMessage, UnifiedContent } from '../types/unified';
import type { ClaudeEvent, ContentBlock } from './types';

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a single JSONL line from a Claude session file into a unified message.
 *
 * Converts a Claude event (user or assistant message) into a standardized format
 * that includes content blocks, timestamps, token usage, and metadata. Returns null
 * for non-message events or invalid lines.
 *
 * @param jsonlLine - A single line from a Claude JSONL session file
 * @returns A unified message object or null if the line cannot be parsed or is not a message
 *
 * @example
 * ```typescript
 * const line = '{"type":"assistant","message":{"role":"assistant","content":"Hello"},"timestamp":"2024-01-01T00:00:00Z"}';
 * const message = parse(line);
 * if (message) {
 *   console.log(message.role, message.content);
 * }
 * ```
 */
export function parse(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: ClaudeEvent = JSON.parse(jsonlLine);

    if (event.type !== 'user' && event.type !== 'assistant') {
      return null;
    }

    const message = event.message;
    if (!message) {
      return null;
    }

    const rawContent = message.content;
    const content: ContentBlock[] = typeof rawContent === 'string' ? [{ type: 'text', text: rawContent }] : rawContent;

    const unifiedContent: UnifiedContent[] = [];

    // Process each content block
    for (const block of content) {
      const processedBlocks = processBlock(block, event.type);
      unifiedContent.push(...processedBlocks);
    }

    return {
      id: event.uuid || message.id || `${event.timestamp}-${event.type}`,
      role: message.role,
      content: unifiedContent,
      timestamp: event.timestamp ? new Date(event.timestamp).getTime() : Date.now(),
      tool: 'claude',
      model: message.model,
      usage: message.usage
        ? {
            inputTokens: message.usage.input_tokens || 0,
            outputTokens: message.usage.output_tokens || 0,
            totalTokens: (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0),
            cacheCreationTokens: message.usage.cache_creation_input_tokens,
            cacheReadTokens: message.usage.cache_read_input_tokens,
          }
        : undefined,
      _original: event,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Processes a content block and returns unified content blocks
 */
function processBlock(block: ContentBlock, eventType: 'user' | 'assistant'): UnifiedContent[] {
  if (block.type === 'text') {
    const textContent = block.text || '';

    // Check if this is a user message with slash command
    if (eventType === 'user' && textContent.includes('<command-name>')) {
      return processUserSlashCommand(textContent);
    } else {
      // Regular text block
      return [
        {
          type: 'text',
          text: textContent,
        },
      ];
    }
  }

  if (block.type === 'thinking') {
    return [
      {
        type: 'thinking',
        thinking: block.thinking || '',
      },
    ];
  }

  if (block.type === 'tool_use') {
    return [
      {
        type: 'tool_use',
        id: block.id || '',
        name: block.name || '',
        input: block.input || {},
      },
    ];
  }

  if (block.type === 'tool_result') {
    return [
      {
        type: 'tool_result',
        tool_use_id: block.tool_use_id || '',
        content: block.content,
        is_error: block.is_error,
      },
    ];
  }

  if (block.type === 'image') {
    return [
      {
        type: 'image',
        source: {
          type: 'base64' as const,
          data: block.source?.data || '',
          media_type: block.source?.media_type || 'image/png',
        },
      },
    ];
  }

  // Fallback for unknown types - shouldn't happen but type-safe
  return [
    {
      type: 'text',
      text: '',
    },
  ];
}

/**
 * Processes user text content that contains slash commands
 */
function processUserSlashCommand(textContent: string): UnifiedContent[] {
  const { command, message: cmdMessage, args, remainingText } = extractSlashCommand(textContent);

  const blocks: UnifiedContent[] = [];

  // Add the slash command block
  if (command) {
    blocks.push({
      type: 'slash_command',
      command,
      message: cmdMessage,
      args,
    });
  }

  // Add remaining text if any
  if (remainingText) {
    blocks.push({
      type: 'text',
      text: remainingText,
    });
  }

  return blocks;
}

/**
 * Extracts slash command information from user message content
 */
function extractSlashCommand(content: string): {
  command?: string;
  message?: string;
  args?: string;
  remainingText: string;
} {
  const commandMatch = content.match(/<command-name>(.*?)<\/command-name>/);
  const messageMatch = content.match(/<command-message>(.*?)<\/command-message>/);
  const argsMatch = content.match(/<command-args>(.*?)<\/command-args>/);

  if (!commandMatch) {
    return { remainingText: content };
  }

  // Remove the command tags from the remaining text
  const remainingText = content
    .replace(/<command-name>.*?<\/command-name>/g, '')
    .replace(/<command-message>.*?<\/command-message>/g, '')
    .replace(/<command-args>.*?<\/command-args>/g, '')
    .trim();

  return {
    command: commandMatch[1]?.trim(),
    message: messageMatch?.[1]?.trim(),
    args: argsMatch?.[1]?.trim(),
    remainingText,
  };
}
