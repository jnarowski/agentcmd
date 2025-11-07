import { describe, it, expect } from 'vitest';
import { shouldRenderMessage } from './messageFilters';
import type { UIMessage } from '@/shared/types/message.types';

describe('shouldRenderMessage', () => {
  it('should filter out messages with empty content arrays', () => {
    const message: UIMessage = {
      id: 'test-1',
      role: 'user',
      content: [],
      timestamp: Date.now(),
      contentSummary: { blockCount: 0, blockTypes: [], isEmpty: true },
    };

    expect(shouldRenderMessage(message)).toBe(false);
  });

  it('should filter out messages with only tool_result blocks', () => {
    const message: UIMessage = {
      id: 'test-2',
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_123',
          content: 'some result',
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 1, blockTypes: ['tool_result'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(false);
  });

  it('should filter out messages with only empty text blocks', () => {
    const message: UIMessage = {
      id: 'test-3',
      role: 'user',
      content: [
        {
          type: 'text',
          text: '',
        },
        {
          type: 'text',
          text: '   ',
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 2, blockTypes: ['text', 'text'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(false);
  });

  it('should keep messages with non-empty text blocks', () => {
    const message: UIMessage = {
      id: 'test-4',
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Hello world',
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 1, blockTypes: ['text'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(true);
  });

  it('should keep messages with tool_use blocks', () => {
    const message: UIMessage = {
      id: 'test-5',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_123',
          name: 'Read',
          input: { file_path: '/test.ts' },
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 1, blockTypes: ['tool_use'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(true);
  });

  it('should keep messages with thinking blocks', () => {
    const message: UIMessage = {
      id: 'test-6',
      role: 'assistant',
      content: [
        {
          type: 'thinking',
          thinking: 'Analyzing the problem...',
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 1, blockTypes: ['thinking'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(true);
  });

  it('should keep messages with mixed content (text + tool_result)', () => {
    const message: UIMessage = {
      id: 'test-7',
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Here is the result:',
        },
        {
          type: 'tool_result',
          tool_use_id: 'toolu_123',
          content: 'some result',
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 2, blockTypes: ['text', 'tool_result'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(true);
  });

  it('should filter out messages with tool_result + empty text', () => {
    const message: UIMessage = {
      id: 'test-8',
      role: 'user',
      content: [
        {
          type: 'text',
          text: '',
        },
        {
          type: 'tool_result',
          tool_use_id: 'toolu_123',
          content: 'some result',
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 2, blockTypes: ['text', 'tool_result'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(false);
  });

  it('should filter out messages with non-array content', () => {
    const message = {
      id: 'test-9',
      role: 'user',
      content: 'string content',
      timestamp: Date.now(),
      contentSummary: { blockCount: 0, blockTypes: [], isEmpty: true },
    } as any;

    expect(shouldRenderMessage(message)).toBe(false);
  });

  it('should keep messages with image blocks', () => {
    const message: UIMessage = {
      id: 'test-10',
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: 'base64data',
          },
        },
      ],
      timestamp: Date.now(),
      contentSummary: { blockCount: 1, blockTypes: ['image'], isEmpty: false },
    };

    expect(shouldRenderMessage(message)).toBe(true);
  });
});
