/**
 * Tests for Gemini message parser.
 *
 * Tests transformation of all 10 individual fixtures to Claude-compatible format.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parse';
import type { GeminiMessage } from './types';

// Import all 10 individual fixtures
import toolReadFile from '../../tests/fixtures/gemini/individual/tool-read_file.json';
import toolWriteFile from '../../tests/fixtures/gemini/individual/tool-write-file.json';
import toolReplace from '../../tests/fixtures/gemini/individual/tool-replace.json';
import toolRunShellCommand from '../../tests/fixtures/gemini/individual/tool-run_shell_command.json';
import toolGoogleWebSearch from '../../tests/fixtures/gemini/individual/tool-google_web_search.json';
import toolListDirectory from '../../tests/fixtures/gemini/individual/tool-list_directory.json';
import toolResultError from '../../tests/fixtures/gemini/individual/tool-result-error.json';
import toolResultCancelled from '../../tests/fixtures/gemini/individual/tool-result-cancelled.json';
import toolResultSuccess from '../../tests/fixtures/gemini/individual/tool-result-success.json';
import geminiWithThoughts from '../../tests/fixtures/gemini/individual/gemini-with-thoughts.json';

describe('parse', () => {
  it('should transform read_file to Read tool', () => {
    const result = parse(toolReadFile as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');
    expect(result._original).toEqual(toolReadFile);

    // Verify tool_use block
    if (Array.isArray(result.content)) {
      const toolUse = result.content.find((c) => c.type === 'tool_use');
      expect(toolUse).toBeDefined();
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.name).toBe('Read');
        expect(toolUse.input).toHaveProperty('file_path');
        expect(String(toolUse.input.file_path)).toContain('main.py');
      }

      // Verify tool_result block
      const toolResult = result.content.find((c) => c.type === 'tool_result');
      expect(toolResult).toBeDefined();
      if (toolResult && toolResult.type === 'tool_result') {
        expect(toolResult.tool_use_id).toBe(toolUse?.id);
        expect(String(toolResult.content)).toContain('def main()');
      }
    }
  });

  it('should transform write_file to Write tool with thoughts', () => {
    const result = parse(toolWriteFile as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify thinking block (from thoughts array)
      const thinking = result.content.find((c) => c.type === 'thinking');
      expect(thinking).toBeDefined();
      if (thinking && thinking.type === 'thinking') {
        expect(thinking.thinking).toContain('Starting the project');
      }

      // Verify tool_use block
      const toolUse = result.content.find((c) => c.type === 'tool_use');
      expect(toolUse).toBeDefined();
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.name).toBe('Write');
        expect(toolUse.input).toHaveProperty('file_path');
        expect(toolUse.input).toHaveProperty('content');
      }

      // Verify tool_result block
      const toolResult = result.content.find((c) => c.type === 'tool_result');
      expect(toolResult).toBeDefined();
      if (toolResult && toolResult.type === 'tool_result') {
        expect(String(toolResult.content)).toContain('Successfully created');
      }
    }
  });

  it('should transform replace to Edit tool', () => {
    const result = parse(toolReplace as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify tool_use block
      const toolUse = result.content.find((c) => c.type === 'tool_use');
      expect(toolUse).toBeDefined();
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.name).toBe('Edit');
        expect(toolUse.input).toHaveProperty('file_path');
        expect(toolUse.input).toHaveProperty('old_string');
        expect(toolUse.input).toHaveProperty('new_string');
        // Verify 'instruction' field is omitted
        expect(toolUse.input).not.toHaveProperty('instruction');
      }
    }
  });

  it('should transform run_shell_command to Bash tool', () => {
    const result = parse(toolRunShellCommand as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify tool_use block
      const toolUse = result.content.find((c) => c.type === 'tool_use');
      expect(toolUse).toBeDefined();
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.name).toBe('Bash');
        expect(toolUse.input).toHaveProperty('command');
      }

      // Verify tool_result block
      const toolResult = result.content.find((c) => c.type === 'tool_result');
      expect(toolResult).toBeDefined();
    }
  });

  it('should transform google_web_search to WebSearch tool', () => {
    const result = parse(toolGoogleWebSearch as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify tool_use block
      const toolUse = result.content.find((c) => c.type === 'tool_use');
      expect(toolUse).toBeDefined();
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.name).toBe('WebSearch');
        expect(toolUse.input).toHaveProperty('query');
      }

      // Verify tool_result block
      const toolResult = result.content.find((c) => c.type === 'tool_result');
      expect(toolResult).toBeDefined();
    }
  });

  it('should transform list_directory to Glob tool', () => {
    const result = parse(toolListDirectory as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify tool_use block
      const toolUse = result.content.find((c) => c.type === 'tool_use');
      expect(toolUse).toBeDefined();
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.name).toBe('Glob');
        expect(toolUse.input).toHaveProperty('pattern');
        expect(toolUse.input.pattern).toBe('*');
        expect(toolUse.input).toHaveProperty('path');
      }
    }
  });

  it('should handle error status correctly', () => {
    const result = parse(toolResultError as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify tool_result block has is_error: true
      const toolResult = result.content.find((c) => c.type === 'tool_result');
      expect(toolResult).toBeDefined();
      if (toolResult && toolResult.type === 'tool_result') {
        expect(toolResult.is_error).toBe(true);
      }
    }
  });

  it('should handle cancelled status correctly', () => {
    const result = parse(toolResultCancelled as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify tool_use and tool_result blocks exist
      const toolUse = result.content.find((c) => c.type === 'tool_use');
      const toolResult = result.content.find((c) => c.type === 'tool_result');
      expect(toolUse).toBeDefined();
      expect(toolResult).toBeDefined();
    }
  });

  it('should handle success status correctly', () => {
    const result = parse(toolResultSuccess as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify tool_result block has is_error: false or undefined
      const toolResult = result.content.find((c) => c.type === 'tool_result');
      expect(toolResult).toBeDefined();
      if (toolResult && toolResult.type === 'tool_result') {
        expect(toolResult.is_error).not.toBe(true);
      }
    }
  });

  it('should transform thoughts array to thinking blocks', () => {
    const result = parse(geminiWithThoughts as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');

    if (Array.isArray(result.content)) {
      // Verify thinking blocks are created from thoughts
      const thinkingBlocks = result.content.filter((c) => c.type === 'thinking');
      expect(thinkingBlocks.length).toBeGreaterThan(0);
      if (thinkingBlocks[0] && thinkingBlocks[0].type === 'thinking') {
        expect(thinkingBlocks[0].thinking).toContain(':');
      }
    }
  });

  it('should preserve token usage information', () => {
    const result = parse(toolReadFile as GeminiMessage);

    expect(result.usage).toBeDefined();
    expect(result.usage?.inputTokens).toBe(5870);
    expect(result.usage?.outputTokens).toBe(41);
    expect(result.usage?.totalTokens).toBe(5939);
    expect(result.usage?.cacheReadTokens).toBe(5420);
  });

  it('should preserve model information', () => {
    const result = parse(toolReadFile as GeminiMessage);

    expect(result.model).toBe('gemini-2.5-pro');
  });

  it('should convert timestamp to milliseconds', () => {
    const result = parse(toolReadFile as GeminiMessage);

    expect(typeof result.timestamp).toBe('number');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should handle messages with only text content', () => {
    const userMessage: GeminiMessage = {
      id: 'test-id',
      timestamp: '2025-10-29T10:00:00.000Z',
      type: 'user',
      content: 'Hello, Gemini!',
      thoughts: [],
    };

    const result = parse(userMessage);

    expect(result.role).toBe('user');
    expect(result.content).toHaveLength(1);
    if (Array.isArray(result.content)) {
      expect(result.content[0]?.type).toBe('text');
      if (result.content[0]?.type === 'text') {
        expect(result.content[0].text).toBe('Hello, Gemini!');
      }
    }
  });

  it('should handle messages with empty content', () => {
    const emptyMessage: GeminiMessage = {
      id: 'test-id',
      timestamp: '2025-10-29T10:00:00.000Z',
      type: 'gemini',
      content: '',
      thoughts: [],
    };

    const result = parse(emptyMessage);

    expect(result.role).toBe('assistant');
    expect(result.content).toBe('');
  });
});
