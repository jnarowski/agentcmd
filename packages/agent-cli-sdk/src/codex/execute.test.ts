import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { execute } from './execute';
import * as spawnModule from '../utils/spawn';
import type { SpawnResult } from '../utils/spawn';
import * as detectCliModule from './detectCli';

// Mock the spawn module
vi.mock('../utils/spawn', () => ({
  spawnProcess: vi.fn(),
}));

// Mock detectCli
vi.mock('./detectCli', () => ({
  detectCli: vi.fn(),
}));

// Mock environment
process.env.CODEX_CLI_PATH = '/usr/local/bin/codex';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates mock Codex CLI output from an array of event objects
 */
function createCodexOutput(events: Array<Record<string, unknown>>): string {
  return events.map((event) => JSON.stringify(event)).join('\n');
}

/**
 * Helper to create a thread.started event
 */
function createThreadStarted(threadId: string) {
  return {
    type: 'thread.started',
    thread_id: threadId,
  };
}

/**
 * Helper to create an agent_message item.completed event
 */
function createAgentMessage(text: string, id = 'item_1') {
  return {
    type: 'item.completed',
    item: {
      id,
      type: 'agent_message',
      text,
    },
  };
}

/**
 * Helper to create a reasoning item.completed event
 */
function createReasoning(text: string, id = 'item_0') {
  return {
    type: 'item.completed',
    item: {
      id,
      type: 'reasoning',
      text,
    },
  };
}

/**
 * Mocks spawnProcess to return the provided output
 */
function mockSpawnWithOutput(output: string, result?: Partial<SpawnResult>) {
  vi.spyOn(spawnModule, 'spawnProcess').mockImplementation(async (_command, options) => {
    if (options.onStdout) {
      options.onStdout(output + '\n');
    }

    if (options.onStderr && result?.stderr) {
      options.onStderr(result.stderr);
    }

    const finalResult: SpawnResult = {
      stdout: output,
      stderr: '',
      exitCode: 0,
      duration: 1000,
      process: {} as ChildProcess, // Mock process object
      ...result,
    };

    if (options.onClose) {
      options.onClose(finalResult.exitCode);
    }

    return finalResult;
  });
}

/**
 * Asserts that spawnProcess was called with expected arguments
 */
function expectSpawnCalledWith(expectedArgs: string[], expectedTimeout?: number) {
  const spawnSpy = spawnModule.spawnProcess as Mock;
  expect(spawnSpy).toHaveBeenCalled();
  const callArgs = spawnSpy.mock.calls[0];
  const [command, options] = callArgs!;
  expect(command).toContain('codex');
  expect(options.args).toEqual(expectedArgs);

  if (expectedTimeout !== undefined) {
    expect(options.timeout).toBe(expectedTimeout);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(detectCliModule, 'detectCli').mockResolvedValue('/usr/local/bin/codex');
  });

  it('should execute a simple command and parse messages', async () => {
    const output = createCodexOutput([createThreadStarted('test-session-123'), createAgentMessage('Hello')]);

    mockSpawnWithOutput(output);

    const result = await execute({
      prompt: 'Say hello',
      permissionMode: 'acceptEdits',
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBe('test-session-123');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe('assistant');
    const content = result.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    if (Array.isArray(content)) {
      expect(content[0]?.type).toBe('text');
    }
  });

  it('should call onEvent callback for each parsed event', async () => {
    const output = createCodexOutput([createThreadStarted('test-session'), createAgentMessage('Response')]);

    mockSpawnWithOutput(output);

    const onEvent = vi.fn();
    await execute({
      prompt: 'test',
      onEvent,
    });

    expect(onEvent).toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        raw: expect.any(String),
        event: expect.objectContaining({ type: 'thread.started' }),
        message: null,
      })
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        raw: expect.any(String),
        event: expect.objectContaining({ type: 'item.completed' }),
        message: expect.objectContaining({ role: 'assistant' }),
      })
    );
  });

  describe('CLI options', () => {
    it('should pass --json flag', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({ prompt: 'test' });

      expectSpawnCalledWith(['exec', '--json', '-s', 'workspace-write', 'test']);
    });

    it('should pass model option to CLI', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        model: 'gpt-4',
      });

      expectSpawnCalledWith(['exec', '--json', '-m', 'gpt-4', '-s', 'workspace-write', 'test']);
    });

    it('should pass sessionId to CLI with resume', async () => {
      const output = createCodexOutput([createThreadStarted('custom-session')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        sessionId: 'custom-session',
      });

      expectSpawnCalledWith(['exec', '--json', '-s', 'workspace-write', 'resume', 'custom-session', 'test']);
    });

    it('should pass permissionMode "default" to CLI', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        permissionMode: 'default',
      });

      expectSpawnCalledWith(['exec', '--json', '-s', 'workspace-write', 'test']);
    });

    it('should pass permissionMode "acceptEdits" to CLI', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        permissionMode: 'acceptEdits',
      });

      expectSpawnCalledWith(['exec', '--json', '--full-auto', 'test']);
    });

    it('should pass permissionMode "plan" to CLI', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        permissionMode: 'plan',
      });

      expectSpawnCalledWith(['exec', '--json', '-s', 'read-only', 'test']);
    });

    it('should pass permissionMode "bypassPermissions" to CLI', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        permissionMode: 'bypassPermissions',
      });

      expectSpawnCalledWith(['exec', '--json', '--dangerously-bypass-approvals-and-sandbox', 'test']);
    });

    it('should convert dangerouslySkipPermissions to bypass flag', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        dangerouslySkipPermissions: true,
      });

      expectSpawnCalledWith(['exec', '--json', '--dangerously-bypass-approvals-and-sandbox', 'test']);
    });

    it('should pass workingDir to CLI', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        workingDir: '/custom/path',
      });

      expectSpawnCalledWith([
        'exec',
        '--json',
        '-C',
        '/custom/path',
        '--skip-git-repo-check',
        '-s',
        'workspace-write',
        'test',
      ]);
    });

    it('should pass timeout to spawnProcess', async () => {
      const output = createCodexOutput([createThreadStarted('test')]);
      mockSpawnWithOutput(output);

      await execute({
        prompt: 'test',
        timeout: 30000,
      });

      expectSpawnCalledWith(['exec', '--json', '-s', 'workspace-write', 'test'], 30000);
    });
  });

  describe('JSON extraction', () => {
    it('should extract JSON from markdown code fence when json is true', async () => {
      const output = createCodexOutput([
        createThreadStarted('test'),
        createAgentMessage('```json\n{"name":"test"}\n```'),
      ]);

      mockSpawnWithOutput(output);

      const result = await execute({
        prompt: 'test',
        json: true,
      });

      expect(result.data).toEqual({ name: 'test' });
    });

    it('should extract plain JSON when json is true', async () => {
      const output = createCodexOutput([
        createThreadStarted('test'),
        createAgentMessage('{"something":"else","count":42}'),
      ]);

      mockSpawnWithOutput(output);

      const result = await execute({
        prompt: 'test',
        json: true,
      });

      expect(result.data).toEqual({ something: 'else', count: 42 });
    });

    it('should return text when JSON extraction fails', async () => {
      const output = createCodexOutput([createThreadStarted('test'), createAgentMessage('This is not valid JSON')]);

      mockSpawnWithOutput(output);

      const result = await execute({
        prompt: 'test',
        json: true,
      });

      expect(result.data).toBe('This is not valid JSON');
    });
  });

  it('should skip empty lines and invalid JSON', async () => {
    const output = [
      JSON.stringify(createThreadStarted('test')),
      '', // empty line
      'invalid json',
      JSON.stringify(createAgentMessage('Hello')),
    ].join('\n');

    mockSpawnWithOutput(output);

    const result = await execute({ prompt: 'test' });

    expect(result.messages).toHaveLength(1);
    const content = result.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    if (Array.isArray(content)) {
      expect(content[0]?.type).toBe('text');
    }
  });

  it('should call onStdout callback with accumulated data', async () => {
    const output = createCodexOutput([createThreadStarted('test'), createAgentMessage('Response')]);

    mockSpawnWithOutput(output);

    const onStdout = vi.fn();
    await execute({
      prompt: 'test',
      onStdout,
    });

    expect(onStdout).toHaveBeenCalled();
    expect(onStdout).toHaveBeenCalledWith(
      expect.objectContaining({
        raw: expect.any(String),
        events: expect.any(Array),
        messages: expect.any(Array),
      })
    );
  });

  it('should parse reasoning and assistant messages', async () => {
    const output = createCodexOutput([
      createThreadStarted('test'),
      createReasoning('**Thinking**'),
      createAgentMessage('Hello'),
    ]);

    mockSpawnWithOutput(output);

    const result = await execute({ prompt: 'test' });

    expect(result.messages).toHaveLength(2);
    const content0 = result.messages[0]?.content;
    const content1 = result.messages[1]?.content;
    expect(Array.isArray(content0)).toBe(true);
    expect(Array.isArray(content1)).toBe(true);
    if (Array.isArray(content0)) {
      expect(content0[0]?.type).toBe('thinking');
    }
    if (Array.isArray(content1)) {
      expect(content1[0]?.type).toBe('text');
    }
  });

  it('should return text output by default (json: false)', async () => {
    const output = createCodexOutput([createThreadStarted('test'), createAgentMessage('Plain text response')]);

    mockSpawnWithOutput(output);

    const result = await execute({
      prompt: 'test',
      json: false,
    });

    expect(result.data).toBe('Plain text response');
  });

  it('should handle errors and return error result', async () => {
    mockSpawnWithOutput('', {
      exitCode: 1,
      stderr: 'Error occurred',
    });

    const result = await execute({ prompt: 'test' });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Error occurred');
  });

  it('should call onStderr callback', async () => {
    const onStderr = vi.fn();
    mockSpawnWithOutput(createCodexOutput([createThreadStarted('test')]), { stderr: 'Warning message' });

    await execute({
      prompt: 'test',
      onStderr,
    });

    expect(onStderr).toHaveBeenCalledWith('Warning message');
  });

  it('should throw error if CLI not found', async () => {
    vi.spyOn(detectCliModule, 'detectCli').mockResolvedValue(null);

    await expect(execute({ prompt: 'test' })).rejects.toThrow('Codex CLI not found');
  });
});
