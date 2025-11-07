import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from './parse';
import type {
  UnifiedToolUseBlock,
  UnifiedToolResultBlock,
  UnifiedThinkingBlock,
  UnifiedTextBlock,
} from '../types/unified';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, '../../tests/fixtures/codex/individual');

describe('parse - Streaming Format (item.completed)', () => {
  describe('item.completed - reasoning', () => {
    it('should transform reasoning to thinking block', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_0',
          type: 'reasoning',
          text: '**Preparing greeting message**',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);

      const block = message?.content[0] as UnifiedThinkingBlock;
      expect(block.type).toBe('thinking');
      expect(block.thinking).toBe('**Preparing greeting message**');
    });

    it('should set tool to "codex"', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_0',
          type: 'reasoning',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?.tool).toBe('codex');
    });
  });

  describe('item.completed - agent_message', () => {
    it('should transform agent_message to text block', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'agent_message',
          text: 'Hello, world!',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);

      const block = message?.content[0] as UnifiedTextBlock;
      expect(block.type).toBe('text');
      expect(block.text).toBe('Hello, world!');
    });
  });

  describe('item.completed - command_execution', () => {
    it('should transform command_execution to tool_use and tool_result', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'command_execution',
          command: 'bash -lc ls',
          aggregated_output: 'file1.txt\nfile2.txt\n',
          exit_code: 0,
          status: 'completed',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(2);

      const toolUse = message?.content[0] as UnifiedToolUseBlock;
      expect(toolUse.type).toBe('tool_use');
      expect(toolUse.name).toBe('Bash');
      expect(toolUse.input).toMatchObject({
        command: 'bash -lc ls',
      });

      const toolResult = message?.content[1] as UnifiedToolResultBlock;
      expect(toolResult.type).toBe('tool_result');
      expect(toolResult.tool_use_id).toBe('item_1');
      expect(toolResult.content).toBe('file1.txt\nfile2.txt\n');
      expect(toolResult.is_error).toBe(false);
    });

    it('should mark tool_result as error when exit_code is non-zero', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'command_execution',
          command: 'bash -lc "exit 1"',
          aggregated_output: 'Error message',
          exit_code: 1,
          status: 'failed',
        },
      });

      const message = parse(jsonl);
      const toolResult = message?.content[1] as UnifiedToolResultBlock;
      expect(toolResult.is_error).toBe(true);
    });
  });

  describe('item.completed - file_change', () => {
    it('should transform file_change add to Write tool_use', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            {
              path: '/path/to/file.txt',
              kind: 'add',
            },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);

      expect(message).not.toBeNull();
      expect(message?.content).toHaveLength(1);

      const block = message?.content[0] as UnifiedToolUseBlock;
      expect(block.type).toBe('tool_use');
      expect(block.name).toBe('Write');
      expect(block.input).toMatchObject({
        file_path: '/path/to/file.txt',
      });
    });

    it('should transform file_change modify to Edit tool_use', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            {
              path: '/path/to/file.txt',
              kind: 'modify',
            },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);
      const block = message?.content[0] as UnifiedToolUseBlock;
      expect(block.name).toBe('Edit');
    });

    it('should transform file_change delete to Bash tool_use', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            {
              path: '/path/to/file.txt',
              kind: 'delete',
            },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);
      const block = message?.content[0] as UnifiedToolUseBlock;
      expect(block.name).toBe('Bash');
      expect(block.input).toMatchObject({
        command: 'rm /path/to/file.txt',
      });
    });

    it('should handle multiple file changes', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'file_change',
          changes: [
            { path: '/file1.txt', kind: 'add' },
            { path: '/file2.txt', kind: 'modify' },
          ],
          status: 'completed',
        },
      });

      const message = parse(jsonl);
      expect(message?.content).toHaveLength(2);
    });
  });

  describe('non-item.completed events', () => {
    it('should return null for thread.started', () => {
      const jsonl = JSON.stringify({
        type: 'thread.started',
        thread_id: '019a2c3d-3ab2-7953-b5b6-a4b07e13f72e',
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for turn.started', () => {
      const jsonl = JSON.stringify({
        type: 'turn.started',
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for turn.completed', () => {
      const jsonl = JSON.stringify({
        type: 'turn.completed',
        usage: { input_tokens: 100, output_tokens: 20 },
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for item.started', () => {
      const jsonl = JSON.stringify({
        type: 'item.started',
        item: { id: 'item_1', type: 'reasoning', text: '' },
      });

      const message = parse(jsonl);
      expect(message).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return null for malformed JSON', () => {
      const jsonl = 'not valid json';
      const message = parse(jsonl);
      expect(message).toBeNull();
    });

    it('should return null for empty string', () => {
      const message = parse('');
      expect(message).toBeNull();
    });
  });

  describe('message metadata', () => {
    it('should use item.id as message id', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'custom_item_id_123',
          type: 'agent_message',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?.id).toBe('custom_item_id_123');
    });

    it('should have timestamp', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'agent_message',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?.timestamp).toBeGreaterThan(0);
    });

    it('should preserve original event in _original field', () => {
      const jsonl = JSON.stringify({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'agent_message',
          text: 'test',
        },
      });

      const message = parse(jsonl);
      expect(message?._original).toBeDefined();
      expect((message?._original as { type?: string })?.type).toBe('item.completed');
    });
  });
});

describe('parse - Persisted Format (response_item)', () => {
  describe('response_item - message', () => {
    it('should parse user message from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'response-message-user.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('user');
      expect(message?.content).toHaveLength(1);
      const firstContent = message?.content[0];
      expect(firstContent).toBeDefined();
      expect(typeof firstContent !== 'string' && firstContent?.type).toBe('text');
      expect((firstContent as UnifiedTextBlock).text).toContain('environment_context');
    });

    it('should parse assistant message from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'response-message-assistant.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);
      const firstContent = message?.content[0];
      expect(firstContent).toBeDefined();
      expect(typeof firstContent !== 'string' && firstContent?.type).toBe('text');
      expect((firstContent as UnifiedTextBlock).text).toContain('TeamSheet');
    });

    it('should set tool to "codex"', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'response-message-assistant.jsonl'), 'utf-8').trim();
      const message = parse(fixture);
      expect(message?.tool).toBe('codex');
    });

    it('should parse timestamp correctly', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'response-message-assistant.jsonl'), 'utf-8').trim();
      const message = parse(fixture);
      expect(message?.timestamp).toBeGreaterThan(0);
      expect(message?.timestamp).toBe(new Date('2025-09-25T01:28:40.413Z').getTime());
    });
  });

  describe('response_item - reasoning', () => {
    it('should parse reasoning from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'response-reasoning.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);
      const firstContent = message?.content[0];
      expect(firstContent).toBeDefined();
      expect(typeof firstContent !== 'string' && firstContent?.type).toBe('thinking');
      expect((firstContent as UnifiedThinkingBlock).thinking).toBe(
        '**Assessing environment and read-only constraints**'
      );
    });
  });

  describe('response_item - function_call', () => {
    it('should transform shell function_call to Bash tool_use from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'function-shell-bash.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);

      const toolUse = message?.content[0] as UnifiedToolUseBlock;
      expect(toolUse.type).toBe('tool_use');
      expect(toolUse.name).toBe('Bash'); // Transformed from "shell"
      expect(toolUse.input).toHaveProperty('command');
      // Should extract actual command from array format
      expect(toolUse.input.command).toBe('rg "TeamSheet"');
    });

    it('should use call_id as message id', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'function-shell-bash.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message?.id).toBe('call_1mb2zpo3ma4hy4OjTDz9oNpC');
    });
  });

  describe('response_item - function_call_output', () => {
    it('should extract output and exit_code from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'function-output-error.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);

      const toolResult = message?.content[0] as UnifiedToolResultBlock;
      expect(toolResult.type).toBe('tool_result');
      expect(toolResult.tool_use_id).toBe('call_1mb2zpo3ma4hy4OjTDz9oNpC');
      // Should extract from JSON wrapper
      expect(toolResult.content).toContain('TeamSheet');
      expect(toolResult.is_error).toBe(false); // exit_code === 0
    });
  });
});

describe('parse - Persisted Format (event_msg)', () => {
  describe('event_msg - agent_message', () => {
    it('should parse agent_message from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'event-agent-message.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);
      const firstContent = message?.content[0];
      expect(firstContent).toBeDefined();
      expect(typeof firstContent !== 'string' && firstContent?.type).toBe('text');
      expect((firstContent as UnifiedTextBlock).text).toContain('TeamSheet');
    });
  });

  describe('event_msg - agent_reasoning', () => {
    it('should parse agent_reasoning from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'event-agent-reasoning.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('assistant');
      expect(message?.content).toHaveLength(1);
      const firstContent = message?.content[0];
      expect(firstContent).toBeDefined();
      expect(typeof firstContent !== 'string' && firstContent?.type).toBe('thinking');
      expect((firstContent as UnifiedThinkingBlock).thinking).toBe(
        '**Assessing environment and read-only constraints**'
      );
    });
  });

  describe('event_msg - user_message', () => {
    it('should parse user_message from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'event-user-message.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).not.toBeNull();
      expect(message?.role).toBe('user');
      expect(message?.content).toHaveLength(1);
      const firstContent = message?.content[0];
      expect(firstContent).toBeDefined();
      expect(typeof firstContent !== 'string' && firstContent?.type).toBe('text');
      expect((firstContent as UnifiedTextBlock).text).toContain('Context from my IDE setup');
    });
  });

  describe('event_msg - token_count', () => {
    it('should return null for token_count from fixture', () => {
      const fixture = readFileSync(join(FIXTURES_PATH, 'event-token-count.jsonl'), 'utf-8').trim();
      const message = parse(fixture);

      expect(message).toBeNull();
    });
  });
});

describe('parse - Metadata Events', () => {
  it('should return null for session_meta from fixture', () => {
    const fixture = readFileSync(join(FIXTURES_PATH, 'session-meta.jsonl'), 'utf-8').trim();
    const message = parse(fixture);

    expect(message).toBeNull();
  });

  it('should return null for turn_context from fixture', () => {
    const fixture = readFileSync(join(FIXTURES_PATH, 'turn-context.jsonl'), 'utf-8').trim();
    const message = parse(fixture);

    expect(message).toBeNull();
  });
});
