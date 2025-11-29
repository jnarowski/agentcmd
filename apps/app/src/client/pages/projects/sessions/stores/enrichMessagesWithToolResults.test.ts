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
 * Type guard for image content
 */
function isImageContent(content: string | UnifiedImageBlock): content is UnifiedImageBlock {
  return typeof content === 'object' && content !== null && content.type === 'image';
}

/**
 * Regex to match .tmp/images paths
 */
const IMAGE_PATH_REGEX = /\/[^\s]+\.tmp\/images\/\d+\/image-\d+\.(png|jpg|jpeg|gif|webp)/gi;

/**
 * Extract image file paths from message content
 */
function extractImagePaths(content: string | { type: string; text?: string }[]): string[] {
  const textContent = typeof content === 'string'
    ? content
    : content.filter(b => b.type === 'text').map(b => b.text || '').join(' ');

  const matches = [...textContent.matchAll(IMAGE_PATH_REGEX)];
  return matches.map(match => match[0]);
}

/**
 * Extract images from text content using imagePathMap
 * Returns both images and matched paths
 */
function extractImagesFromText(
  content: string | { type: string; text?: string }[],
  imagePathMap: Map<string, UnifiedImageBlock>
): { images: string[]; matchedPaths: string[] } {
  const images: string[] = [];
  const matchedPaths: string[] = [];
  const paths = extractImagePaths(content);

  for (const filePath of paths) {
    const imageBlock = imagePathMap.get(filePath);
    if (imageBlock) {
      const dataUrl = `data:${imageBlock.source.media_type};base64,${imageBlock.source.data}`;
      images.push(dataUrl);
      matchedPaths.push(filePath);
    }
  }

  return { images, matchedPaths };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove matched file paths from content
 */
function removePathsFromContent(
  content: { type: string; text?: string }[],
  pathsToRemove: string[]
): { type: string; text?: string }[] {
  if (pathsToRemove.length === 0) return content;

  return content.map(block => {
    if (block.type === 'text' && block.text) {
      let text = block.text;
      for (const path of pathsToRemove) {
        text = text.replace(new RegExp(escapeRegExp(path) + '\\s*', 'g'), '');
      }
      text = text.replace(/\s+/g, ' ').trim();
      return { ...block, text };
    }
    return block;
  });
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

  // Step 3: Build imagePathMap by matching tool_use inputs with results
  const imagePathMap = new Map<string, UnifiedImageBlock>();
  for (const message of filteredMessages) {
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'tool_use' && block.name === 'Read') {
          const filePath = (block.input as { file_path?: string })?.file_path;
          const result = resultMap.get(block.id);
          // Only add to imagePathMap if result exists, is not an error, and is an image
          if (filePath && result && !result.is_error && isImageContent(result.content)) {
            imagePathMap.set(filePath, result.content);
          }
        }
      }
    }
  }

  // Step 4: Enrich tool_use blocks and filter out tool_result blocks
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

    // For user messages, extract images from file paths in text and remove paths
    let images: string[] | undefined;
    let finalContent = enrichedContent;
    if (msg.role === 'user') {
      const existingImages = ('images' in msg && Array.isArray(msg.images)) ? msg.images : [];
      const { images: extractedImages, matchedPaths } = extractImagesFromText(msg.content, imagePathMap);
      if (existingImages.length > 0 || extractedImages.length > 0) {
        images = [...existingImages, ...extractedImages];
      }
      // Remove matched paths from content
      if (matchedPaths.length > 0) {
        finalContent = removePathsFromContent(enrichedContent, matchedPaths);
      }
    }

    return {
      ...msg,
      content: finalContent,
      isStreaming: false,
      ...(images && { images })
    } as UIMessage;
  });

  // Step 5: Filter out messages with empty content arrays (tool_result-only messages after enrichment)
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

describe('image extraction from tool results to user messages', () => {
  it('should populate images array from Read tool result with image and remove path from text', () => {
    const imageData: UnifiedImageBlock = {
      type: 'image',
      source: {
        type: 'base64',
        data: 'iVBORw0KGgo...',
        media_type: 'image/png'
      }
    };

    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          { type: 'text', text: 'What is this? /Users/test/.tmp/images/123/image-0.png' }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_read',
            name: 'Read',
            input: { file_path: '/Users/test/.tmp/images/123/image-0.png' }
          }
        ],
        timestamp: 2000
      },
      {
        id: 'msg-3',
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_read',
            content: JSON.stringify([imageData])
          }
        ],
        timestamp: 3000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    // User message should have images populated
    const userMsg = enriched.find(m => m.id === 'msg-1');
    expect(userMsg?.images).toHaveLength(1);
    expect(userMsg?.images?.[0]).toContain('data:image/png;base64,');

    // File path should be removed from text
    const textBlock = userMsg?.content.find(b => b.type === 'text');
    expect(textBlock?.text).toBe('What is this?');
    expect(textBlock?.text).not.toContain('.tmp/images');
  });

  it('should handle multiple images in one user message', () => {
    const imageData1: UnifiedImageBlock = {
      type: 'image',
      source: { type: 'base64', data: 'img1data', media_type: 'image/png' }
    };
    const imageData2: UnifiedImageBlock = {
      type: 'image',
      source: { type: 'base64', data: 'img2data', media_type: 'image/jpeg' }
    };

    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          { type: 'text', text: 'Compare /Users/a/.tmp/images/1/image-0.png and /Users/b/.tmp/images/2/image-1.jpg' }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'read1', name: 'Read', input: { file_path: '/Users/a/.tmp/images/1/image-0.png' } },
          { type: 'tool_use', id: 'read2', name: 'Read', input: { file_path: '/Users/b/.tmp/images/2/image-1.jpg' } }
        ],
        timestamp: 2000
      },
      {
        id: 'msg-3',
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'read1', content: JSON.stringify([imageData1]) },
          { type: 'tool_result', tool_use_id: 'read2', content: JSON.stringify([imageData2]) }
        ],
        timestamp: 3000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    const userMsg = enriched.find(m => m.id === 'msg-1');
    expect(userMsg?.images).toHaveLength(2);
    expect(userMsg?.images?.[0]).toContain('data:image/png;base64,');
    expect(userMsg?.images?.[1]).toContain('data:image/jpeg;base64,');
  });

  it('should not populate images for non-.tmp paths', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          { type: 'text', text: 'Read /src/index.ts please' }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'read1', name: 'Read', input: { file_path: '/src/index.ts' } }
        ],
        timestamp: 2000
      },
      {
        id: 'msg-3',
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'read1', content: 'export const foo = "bar";' }
        ],
        timestamp: 3000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    const userMsg = enriched.find(m => m.id === 'msg-1');
    expect(userMsg?.images).toBeUndefined();
  });

  it('should handle image not yet read (no tool result)', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          { type: 'text', text: 'What is this? /Users/test/.tmp/images/123/image-0.png' }
        ],
        timestamp: 1000
      }
      // No Read tool_use or tool_result yet
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    const userMsg = enriched.find(m => m.id === 'msg-1');
    expect(userMsg?.images).toBeUndefined();
  });

  it('should handle Read tool with error result', () => {
    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          { type: 'text', text: 'What is this? /Users/test/.tmp/images/123/image-0.png' }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'read1', name: 'Read', input: { file_path: '/Users/test/.tmp/images/123/image-0.png' } }
        ],
        timestamp: 2000
      },
      {
        id: 'msg-3',
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'read1', content: 'File not found', is_error: true }
        ],
        timestamp: 3000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    // Should not populate images from error results
    const userMsg = enriched.find(m => m.id === 'msg-1');
    expect(userMsg?.images).toBeUndefined();
  });

  it('should preserve existing images array', () => {
    const imageData: UnifiedImageBlock = {
      type: 'image',
      source: { type: 'base64', data: 'newimgdata', media_type: 'image/png' }
    };

    // Cast to UIMessage to include existing images
    const messages: (UnifiedMessage | { id: string; role: string; content: { type: string; text: string }[]; timestamp: number; images?: string[] })[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          { type: 'text', text: 'What is this? /Users/test/.tmp/images/123/image-0.png' }
        ],
        timestamp: 1000,
        images: ['data:image/png;base64,existingimage'] // Already has an optimistic image
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'read1', name: 'Read', input: { file_path: '/Users/test/.tmp/images/123/image-0.png' } }
        ],
        timestamp: 2000
      },
      {
        id: 'msg-3',
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'read1', content: JSON.stringify([imageData]) }
        ],
        timestamp: 3000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages as UnifiedMessage[]);

    const userMsg = enriched.find(m => m.id === 'msg-1');
    // Should preserve existing + add extracted
    expect(userMsg?.images).toHaveLength(2);
    expect(userMsg?.images?.[0]).toBe('data:image/png;base64,existingimage');
    expect(userMsg?.images?.[1]).toContain('data:image/png;base64,');
  });

  it('should handle various image extensions', () => {
    const makeImageData = (type: string): UnifiedImageBlock => ({
      type: 'image',
      source: { type: 'base64', data: 'imgdata', media_type: `image/${type}` }
    });

    const messages: UnifiedMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          { type: 'text', text: '/a/.tmp/images/1/image-0.png /b/.tmp/images/2/image-1.jpeg /c/.tmp/images/3/image-2.gif /d/.tmp/images/4/image-3.webp' }
        ],
        timestamp: 1000
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'r1', name: 'Read', input: { file_path: '/a/.tmp/images/1/image-0.png' } },
          { type: 'tool_use', id: 'r2', name: 'Read', input: { file_path: '/b/.tmp/images/2/image-1.jpeg' } },
          { type: 'tool_use', id: 'r3', name: 'Read', input: { file_path: '/c/.tmp/images/3/image-2.gif' } },
          { type: 'tool_use', id: 'r4', name: 'Read', input: { file_path: '/d/.tmp/images/4/image-3.webp' } }
        ],
        timestamp: 2000
      },
      {
        id: 'msg-3',
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'r1', content: JSON.stringify([makeImageData('png')]) },
          { type: 'tool_result', tool_use_id: 'r2', content: JSON.stringify([makeImageData('jpeg')]) },
          { type: 'tool_result', tool_use_id: 'r3', content: JSON.stringify([makeImageData('gif')]) },
          { type: 'tool_result', tool_use_id: 'r4', content: JSON.stringify([makeImageData('webp')]) }
        ],
        timestamp: 3000
      }
    ];

    const enriched = enrichMessagesWithToolResults(messages);

    const userMsg = enriched.find(m => m.id === 'msg-1');
    expect(userMsg?.images).toHaveLength(4);
  });
});
