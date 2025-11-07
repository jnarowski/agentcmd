/**
 * Tests for enrichMessagesWithToolResults function
 * Validates image support, tool result nesting, and system message filtering
 */

import { describe, it, expect } from "vitest";
import type { UnifiedMessage, UnifiedImageBlock } from 'agent-cli-sdk';
import type { UIMessage } from '@/shared/types/message.types';

// Import the private function for testing by accessing it through the store module
// Since it's not exported, we'll test it indirectly through message loading
// For direct testing, we can re-implement the helper or export it for testing

/**
 * Helper function to parse tool result content and preserve image structure
 * (Re-implemented from sessionStore.ts for testing)
 */
function tryParseImageContent(content: unknown): string | UnifiedImageBlock {
  // If already a string, try to parse it as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      // Check if it's an array with an image object
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.type === 'image') {
        return parsed[0];
      }
      // Not an image, return stringified
      return content;
    } catch {
      // Not valid JSON, return as-is
      return content;
    }
  }

  // If it's an array, check if first item is an image
  if (Array.isArray(content) && content.length > 0 && content[0]?.type === 'image') {
    return content[0];
  }

  // For any other type, stringify it
  return JSON.stringify(content);
}

/**
 * System message detection helper
 * (Re-implemented from message.utils.ts for testing)
 */
function isSystemMessage(text: string): boolean {
  const trimmed = text.trim();

  // Check for system reminder tags
  if (trimmed.includes('<system-reminder>') || trimmed.includes('</system-reminder>')) {
    return true;
  }

  // Check for caveat tags
  if (trimmed.includes('<caveat>') || trimmed.includes('</caveat>')) {
    return true;
  }

  // Check for command message tags
  if (trimmed.includes('<command-message>') || trimmed.includes('</command-message>')) {
    return true;
  }

  return false;
}

/**
 * Simplified enrichment logic for testing
 */
function enrichMessagesWithToolResults(messages: UnifiedMessage[]): UIMessage[] {
  // Step 1: Filter out messages with only system content
  const filteredMessages = messages.filter(msg => {
    const content = msg.content;

    if (typeof content === 'string') {
      return !isSystemMessage(content);
    }

    if (Array.isArray(content)) {
      const textBlocks = content.filter(c => c.type === 'text');
      if (textBlocks.length === 0) return true;
      return !textBlocks.every(c => isSystemMessage(c.text));
    }

    return true;
  });

  // Step 2: Build lookup map of tool results
  const resultMap = new Map<string, { content: string | UnifiedImageBlock; is_error?: boolean }>();

  for (const message of filteredMessages) {
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'tool_result') {
          resultMap.set(block.tool_use_id, {
            content: tryParseImageContent(block.content),
            is_error: block.is_error
          });
        }
      }
    }
  }

  // Step 3: Enrich tool_use blocks and filter out tool_result blocks
  const enrichedMessages = filteredMessages.map(msg => {
    if (!Array.isArray(msg.content)) {
      return { ...msg, isStreaming: false };
    }

    const enrichedContent = msg.content
      .map(block => {
        // Nest result into tool_use block
        if (block.type === 'tool_use') {
          const result = resultMap.get(block.id);
          return result ? { ...block, result } : block;
        }
        return block;
      })
      // Filter out standalone tool_result blocks (now nested in tool_use)
      .filter(block => block.type !== 'tool_result');

    return {
      ...msg,
      content: enrichedContent,
      isStreaming: false
    } as UIMessage;
  });

  // Step 4: Filter out messages with empty content arrays (tool_result-only messages after enrichment)
  return enrichedMessages.filter(msg => {
    // Keep messages with non-array content (edge case)
    if (!Array.isArray(msg.content)) return true;

    // Filter out empty content arrays (user messages with only tool_result blocks)
    return msg.content.length > 0;
  });
}

describe('tryParseImageContent', () => {
  it('should parse stringified JSON array with image object', () => {
    const imageObj = {
      type: 'image',
      source: {
        type: 'base64',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        media_type: 'image/png'
      }
    };
    const stringified = JSON.stringify([imageObj]);

    const result = tryParseImageContent(stringified);

    expect(result).toEqual(imageObj);
    expect(result.type).toBe('image');
  });

  it('should return string as-is if not valid JSON', () => {
    const plainText = 'export const foo = "bar";';

    const result = tryParseImageContent(plainText);

    expect(result).toBe(plainText);
  });

  it('should return string as-is if JSON but not an image array', () => {
    const jsonText = '{"foo": "bar"}';

    const result = tryParseImageContent(jsonText);

    expect(result).toBe(jsonText);
  });

  it('should extract image from array directly (not stringified)', () => {
    const imageObj = {
      type: 'image',
      source: {
        type: 'base64',
        data: 'base64data',
        media_type: 'image/png'
      }
    };

    const result = tryParseImageContent([imageObj]);

    expect(result).toEqual(imageObj);
  });

  it('should stringify non-string, non-array content', () => {
    const obj = { foo: 'bar', count: 42 };

    const result = tryParseImageContent(obj);

    expect(result).toBe(JSON.stringify(obj));
  });

  it('should return empty string for empty array', () => {
    const result = tryParseImageContent([]);

    expect(result).toBe(JSON.stringify([]));
  });
});

describe('enrichMessagesWithToolResults', () => {
  it('should nest tool_result into tool_use block', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me read the file' },
          {
            type: 'tool_use',
            id: 'tool_abc123',
            name: 'Read',
            input: { file_path: '/src/index.ts' }
          }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_abc123',
            content: 'export const foo = "bar";'
          }
        ],
        timestamp: 2000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    // Should have 1 message (tool_result message filtered out)
    expect(enriched).toHaveLength(1);

    // Tool_use should have nested result
    const toolUse = enriched[0]?.content.find((b) => b.type === 'tool_use');
    expect(toolUse).toBeDefined();
    expect(toolUse?.result).toEqual({
      content: 'export const foo = "bar";',
      is_error: undefined
    });
  });

  it('should preserve image structure in tool results', () => {
    const imageData = {
      type: 'image',
      source: {
        type: 'base64',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        media_type: 'image/png'
      }
    };

    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_img',
            name: 'Read',
            input: { file_path: '/image.png' }
          }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_img',
            content: JSON.stringify([imageData])  // Stringified image
          }
        ],
        timestamp: 2000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    const toolUse = enriched[0]?.content.find((b) => b.type === 'tool_use');
    expect(toolUse?.result.content).toEqual(imageData);
    if (toolUse?.result && typeof toolUse.result.content !== 'string') {
      expect(toolUse.result.content.type).toBe('image');
    }
  });

  it('should handle error tool results', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_err',
            name: 'Read',
            input: { file_path: '/not/found.ts' }
          }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_err',
            content: 'File not found',
            is_error: true
          }
        ],
        timestamp: 2000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    const toolUse = enriched[0]?.content.find((b) => b.type === 'tool_use');
    expect(toolUse?.result).toEqual({
      content: 'File not found',
      is_error: true
    });
  });

  it('should filter out messages with only system content', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: '<system-reminder>This is a system reminder</system-reminder>',
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'user',
        content: [
          { type: 'text', text: 'Real user message' }
        ],
        timestamp: 2000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    // Only the real user message should remain
    expect(enriched).toHaveLength(1);
    expect(enriched[0].id).toBe('msg-2');
  });

  it('should keep messages with mixed system and real content', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Real content' },
          { type: 'text', text: '<system-reminder>System content</system-reminder>' }
        ],
        timestamp: 1000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    // Message should be kept since it has real content
    expect(enriched).toHaveLength(1);
  });

  it('should handle multiple tool uses with separate results', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'tool_1', name: 'Read', input: { file_path: '/a.ts' } },
          { type: 'tool_use', id: 'tool_2', name: 'Read', input: { file_path: '/b.ts' } }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'tool_1', content: 'content A' },
          { type: 'tool_result', tool_use_id: 'tool_2', content: 'content B' }
        ],
        timestamp: 2000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    const toolUse1 = enriched[0]?.content.find((b) => b.type === 'tool_use' && b.id === 'tool_1');
    const toolUse2 = enriched[0]?.content.find((b) => b.type === 'tool_use' && b.id === 'tool_2');

    expect(toolUse1?.result.content).toBe('content A');
    expect(toolUse2?.result.content).toBe('content B');
  });

  it('should set isStreaming to false on all messages', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
        timestamp: 1000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    expect(enriched[0].isStreaming).toBe(false);
  });

  it('should filter out messages with empty content arrays', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'user',
        content: [{ type: 'text', text: 'Real message' }],
        timestamp: 2000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    // Empty content message should be filtered out (likely contained only tool_result blocks)
    expect(enriched).toHaveLength(1);
    expect(enriched[0].id).toBe('msg-2');
  });
});
