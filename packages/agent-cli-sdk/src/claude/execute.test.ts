import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { execute } from './execute';
import * as spawnModule from '../utils/spawn';
import type { SpawnResult } from '../utils/spawn';
import * as detectCliModule from './detectCli';
import type { UnifiedMessage } from '../types/unified';

// Mock the spawn module
vi.mock('../utils/spawn', () => ({
  spawnProcess: vi.fn(),
}));

// Mock detectCli
vi.mock('./detectCli', () => ({
  detectCli: vi.fn(),
}));

// Mock environment
process.env.CLAUDE_CLI_PATH = '/usr/local/bin/claude';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates mock Claude CLI output from an array of event objects
 * Converts objects to newline-separated JSON strings (Claude CLI output format)
 */
function createClaudeOutput(events: Array<Record<string, unknown>>): string {
  return events.map((event) => JSON.stringify(event)).join('\n');
}

/**
 * Mocks spawnProcess to return the provided output
 * Simulates Claude CLI execution with stdout callback and default exit success
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

    // Call onClose after processing
    if (options.onClose) {
      options.onClose(finalResult.exitCode);
    }

    return finalResult;
  });
}

/**
 * Asserts that spawnProcess was called with expected arguments
 * Verifies command contains 'claude', args match exactly, and optional timeout
 */
function expectSpawnCalledWith(expectedArgs: string[], expectedTimeout?: number) {
  expect(spawnModule.spawnProcess).toHaveBeenCalledTimes(1);

  const callArgs = vi.mocked(spawnModule.spawnProcess).mock.calls[0];
  expect(callArgs).toBeDefined();

  const [command, options] = callArgs!;
  expect(command).toContain('claude');
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
    // Ensure CLI path is set for tests
    process.env.CLAUDE_CLI_PATH = '/usr/local/bin/claude';
    // Mock detectCli to return a valid path by default
    vi.mocked(detectCliModule.detectCli).mockResolvedValue('/usr/local/bin/claude');
  });

  it('should execute a simple command and parse messages', async () => {
    // Arrange: Mock spawnProcess to simulate Claude CLI output
    const mockOutput = createClaudeOutput([
      { type: 'system', subtype: 'init', session_id: 'test-session-123', cwd: '/test' },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Hello, world!' }] },
      },
      { type: 'result', subtype: 'success', result: 'Hello, world!' },
    ]);

    mockSpawnWithOutput(mockOutput);

    // Act: Execute command
    const result = await execute({
      prompt: 'Hello',
      timeout: 5000,
    });

    // Assert: Verify results
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBe('test-session-123');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe('assistant');
    expect(result.data).toContain('Hello, world!');
    expect(result.duration).toBe(1000);
    expect(result.error).toBeUndefined();

    // Verify spawnProcess was called correctly
    expectSpawnCalledWith(['-p', '--output-format', 'stream-json', '--verbose', 'Hello'], 5000);
  });

  it('should throw error when Claude CLI is not found', async () => {
    // Arrange: Mock detectCli to return null
    vi.mocked(detectCliModule.detectCli).mockResolvedValue(null);

    // Act & Assert
    await expect(execute({ prompt: 'test' })).rejects.toThrow(
      'Claude CLI not found. Set CLAUDE_CLI_PATH or install Claude Code.'
    );
  });

  it('should call onEvent callback for each parsed event', async () => {
    const mockOutput = createClaudeOutput([
      { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Message 1' }] },
      },
      { type: 'result', subtype: 'success' },
    ]);

    mockSpawnWithOutput(mockOutput);

    const onEvent = vi.fn();
    await execute({ prompt: 'test', onEvent });

    // Called once per event
    expect(onEvent).toHaveBeenCalledTimes(3);

    // System event includes event but no parsed message
    expect(onEvent).toHaveBeenNthCalledWith(1, {
      raw: expect.any(String),
      event: expect.objectContaining({ type: 'system' }),
      message: null,
    });

    // Assistant event includes both event and parsed message
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      raw: expect.any(String),
      event: expect.objectContaining({ type: 'assistant' }),
      message: expect.objectContaining({ role: 'assistant' }),
    });

    // Result event includes event but no parsed message
    expect(onEvent).toHaveBeenNthCalledWith(3, {
      raw: expect.any(String),
      event: expect.objectContaining({ type: 'result' }),
      message: null,
    });
  });

  describe('CLI options', () => {
    it('should pass model option to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', model: 'opus' });

      expectSpawnCalledWith(['-p', '--model', 'opus', '--output-format', 'stream-json', '--verbose', 'test']);
    });

    it('should pass sessionId to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'custom-session', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', sessionId: 'custom-session' });

      expectSpawnCalledWith([
        '-p',
        '--session-id',
        'custom-session',
        '--output-format',
        'stream-json',
        '--verbose',
        'test',
      ]);
    });

    it('should use resume flag when both sessionId and resume are provided', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'resume-session', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', sessionId: 'resume-session', resume: true });

      expectSpawnCalledWith([
        '-p',
        '--resume',
        'resume-session',
        '--output-format',
        'stream-json',
        '--verbose',
        'test',
      ]);
    });

    it('should pass continue flag to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', continue: true });

      expectSpawnCalledWith(['-p', '--continue', '--output-format', 'stream-json', '--verbose', 'test']);
    });

    it('should pass permissionMode to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', permissionMode: 'default' });

      expectSpawnCalledWith([
        '-p',
        '--permission-mode',
        'default',
        '--output-format',
        'stream-json',
        '--verbose',
        'test',
      ]);
    });

    it('should pass permissionMode "acceptEdits" to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', permissionMode: 'acceptEdits' });

      expectSpawnCalledWith([
        '-p',
        '--permission-mode',
        'acceptEdits',
        '--output-format',
        'stream-json',
        '--verbose',
        'test',
      ]);
    });

    it('should pass permissionMode "plan" to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', permissionMode: 'plan' });

      expectSpawnCalledWith(['-p', '--permission-mode', 'plan', '--output-format', 'stream-json', '--verbose', 'test']);
    });

    it('should pass permissionMode "bypassPermissions" to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', permissionMode: 'bypassPermissions' });

      expectSpawnCalledWith([
        '-p',
        '--permission-mode',
        'bypassPermissions',
        '--output-format',
        'stream-json',
        '--verbose',
        'test',
      ]);
    });

    it('should convert dangerouslySkipPermissions to bypassPermissions mode', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', dangerouslySkipPermissions: true });

      expectSpawnCalledWith([
        '-p',
        '--permission-mode',
        'bypassPermissions',
        '--output-format',
        'stream-json',
        '--verbose',
        'test',
      ]);
    });

    it('should pass tool restrictions to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({
        prompt: 'test',
        toolSettings: {
          allowedTools: ['Read', 'Write'],
          disallowedTools: ['Bash'],
        },
      });

      expectSpawnCalledWith([
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--allowed-tools',
        'Read,Write',
        '--disallowed-tools',
        'Bash',
        'test',
      ]);
    });

    it('should pass multiple images to CLI', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({
        prompt: 'test',
        images: [{ path: '/path/to/image1.png' }, { path: '/path/to/image2.png' }],
      });

      expectSpawnCalledWith([
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '-i',
        '/path/to/image1.png',
        '-i',
        '/path/to/image2.png',
        'test',
      ]);
    });

    it('should pass workingDir to spawn process', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/custom' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', workingDir: '/custom' });

      const callArgs = vi.mocked(spawnModule.spawnProcess).mock.calls[0];
      expect(callArgs![1].cwd).toBe('/custom');
    });

    it('should use custom timeout when provided', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      ]);

      mockSpawnWithOutput(mockOutput);

      await execute({ prompt: 'test', timeout: 10000 });

      expectSpawnCalledWith(expect.any(Array), 10000);
    });

  });

  describe('JSON extraction', () => {
    it('should extract JSON from markdown code fence when json is true', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Here is the data: ```json\n{"name":"test"}\n```' }],
          },
        },
        { type: 'result', subtype: 'success', result: '```json\n{"name":"test"}\n```' },
      ]);

      mockSpawnWithOutput(mockOutput);

      const result = await execute({ prompt: 'test', json: true });

      expect(result.data).toEqual({ name: 'test' });
    });

    it('should extract plain JSON when json is true', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: '{"something":"else","count":42}' }],
          },
        },
        { type: 'result', subtype: 'success', result: '{"something":"else","count":42}' },
      ]);

      mockSpawnWithOutput(mockOutput);

      const result = await execute({ prompt: 'test', json: true });

      expect(result.data).toEqual({ something: 'else', count: 42 });
    });

    it('should extract JSON from result event when available', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Some text' }],
          },
        },
        { type: 'result', subtype: 'success', result: '{"data":"from-result-event"}' },
      ]);

      mockSpawnWithOutput(mockOutput);

      const result = await execute({ prompt: 'test', json: true });

      expect(result.data).toEqual({ data: 'from-result-event' });
    });

    it('should return text when JSON extraction fails', async () => {
      const mockOutput = createClaudeOutput([
        { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'This is not valid JSON' }],
          },
        },
      ]);

      mockSpawnWithOutput(mockOutput);

      const result = await execute({ prompt: 'test', json: true });

      expect(typeof result.data).toBe('string');
      expect(result.data).toBe('This is not valid JSON');
    });
  });

  it('should return sessionId as "unknown" when no init event', async () => {
    const mockOutput = createClaudeOutput([
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'test' }] },
      },
    ]);

    mockSpawnWithOutput(mockOutput);

    const result = await execute({ prompt: 'test' });

    expect(result.sessionId).toBe('unknown');
  });

  it('should handle non-zero exit code', async () => {
    const mockOutput = createClaudeOutput([{ type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' }]);

    mockSpawnWithOutput(mockOutput, { exitCode: 1, stderr: 'Something went wrong' });

    const result = await execute({ prompt: 'test' });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Something went wrong');
  });

  it('should call onStderr callback', async () => {
    const mockOutput = createClaudeOutput([{ type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' }]);

    mockSpawnWithOutput(mockOutput, { stderr: 'Warning: something happened' });

    const onStderr = vi.fn();
    await execute({ prompt: 'test', onStderr });

    expect(onStderr).toHaveBeenCalledWith('Warning: something happened');
  });

  it('should call onClose callback', async () => {
    const mockOutput = createClaudeOutput([{ type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' }]);

    mockSpawnWithOutput(mockOutput, { exitCode: 0 });

    const onClose = vi.fn();
    await execute({ prompt: 'test', onClose });

    expect(onClose).toHaveBeenCalledWith(0);
  });

  it('should skip empty lines and invalid JSON', async () => {
    const mockOutput = [
      '{"type":"system","subtype":"init","session_id":"test-123","cwd":"/test"}',
      '', // Empty line
      '   ', // Whitespace line
      'invalid json', // Invalid JSON
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"test"}]}}',
    ].join('\n');

    mockSpawnWithOutput(mockOutput);

    const result = await execute({ prompt: 'test' });

    expect(result.messages).toHaveLength(1);
    expect(result.sessionId).toBe('test-123');
  });

  it('should call onStdout callback with accumulated data', async () => {
    const mockOutput = createClaudeOutput([
      { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Message 1' }] },
      },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Message 2' }] },
      },
    ]);

    mockSpawnWithOutput(mockOutput);

    const onStdout = vi.fn();
    await execute({ prompt: 'test', onStdout });

    // onStdout is called once per stdout chunk
    expect(onStdout).toHaveBeenCalled();

    // Last call should have all accumulated data
    const lastCall = onStdout.mock.calls[onStdout.mock.calls.length - 1]![0];

    // Verify accumulated raw output contains session ID
    expect(lastCall.raw).toContain('test-123');

    // Verify events array contains all parsed events
    expect(lastCall.events.length).toBeGreaterThan(0);
    expect(lastCall.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'system' }),
        expect.objectContaining({ type: 'assistant' }),
      ])
    );

    // Verify messages array contains only message events (not system events)
    expect(lastCall.messages.length).toBeGreaterThan(0);
    expect(lastCall.messages.every((msg: UnifiedMessage) => msg.role === 'assistant')).toBe(true);
  });

  it('should call onError callback when error occurs', async () => {
    const testError = new Error('Test error');

    vi.spyOn(spawnModule, 'spawnProcess').mockImplementation(async (_command, options) => {
      options.onError?.(testError);
      return { stdout: '', stderr: '', exitCode: 1, duration: 0, process: {} as ChildProcess };
    });

    const onError = vi.fn();
    await execute({ prompt: 'test', onError });

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('should parse user and tool messages', async () => {
    const mockOutput = createClaudeOutput([
      { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'User message' }] } },
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: {} }],
        },
      },
    ]);

    mockSpawnWithOutput(mockOutput);

    const result = await execute({ prompt: 'test' });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]?.role).toBe('user');
    expect(result.messages[1]?.role).toBe('assistant');
  });

  it('should return text output by default (json: false)', async () => {
    const mockOutput = createClaudeOutput([
      { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Plain text response' }] },
      },
    ]);

    mockSpawnWithOutput(mockOutput);

    const result = await execute({ prompt: 'test' });

    expect(typeof result.data).toBe('string');
    expect(result.data).toBe('Plain text response');
  });

  it('should handle empty output gracefully', async () => {
    const mockOutput = createClaudeOutput([
      { type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' },
      { type: 'result', subtype: 'success' },
    ]);

    mockSpawnWithOutput(mockOutput);

    const result = await execute({ prompt: 'test' });

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(0);
    expect(result.data).toBe('');
  });

  it('should include error message when command fails without stderr', async () => {
    const mockOutput = createClaudeOutput([{ type: 'system', subtype: 'init', session_id: 'test-123', cwd: '/test' }]);

    mockSpawnWithOutput(mockOutput, { exitCode: 1, stderr: '' });

    const result = await execute({ prompt: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Command failed');
  });
});
