import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectCli } from './detectCli';
import * as fs from 'node:fs';

// Mock modules - we need to mock node:util as well
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: (_fn: unknown) => {
    // Return the exec mock itself wrapped as an async function
    return vi.fn(async (...args: unknown[]) => {
      const cp = await import('node:child_process');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (cp.exec as any)(...args);
    });
  },
}));

vi.mock('node:fs');

describe('detectCli', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    // Set up default exec mock to reject
    const { exec } = await import('node:child_process');
    vi.mocked(exec).mockImplementation((() => {
      throw new Error('Command not found');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return path from CLAUDE_CLI_PATH environment variable if it exists', async () => {
    const testPath = '/custom/path/to/claude';
    process.env.CLAUDE_CLI_PATH = testPath;

    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = await detectCli();

    expect(result).toBe(testPath);
    expect(fs.existsSync).toHaveBeenCalledWith(testPath);
  });

  it('should return null if CLAUDE_CLI_PATH exists but file does not', async () => {
    process.env.CLAUDE_CLI_PATH = '/nonexistent/path';
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await detectCli();

    expect(result).toBe(null);
  });

  it('should find CLI in PATH using which command', async () => {
    const testPath = '/usr/local/bin/claude';
    delete process.env.CLAUDE_CLI_PATH;

    const { exec } = await import('node:child_process');
    vi.mocked(exec).mockImplementation(((_cmd: string, callback: (error: null, result: { stdout: string }) => void) => {
      callback(null, { stdout: `${testPath}\n` });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = await detectCli();

    expect(result).toBe(testPath);
  });

  it('should handle shell aliases in which output', async () => {
    const testPath = '/opt/homebrew/bin/claude';
    delete process.env.CLAUDE_CLI_PATH;

    const { exec } = await import('node:child_process');
    vi.mocked(exec).mockImplementation(((_cmd: string, callback: (error: null, result: { stdout: string }) => void) => {
      callback(null, { stdout: `claude: aliased to ${testPath}\n` });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
    vi.mocked(fs.existsSync).mockImplementation((path) => path === testPath);

    const result = await detectCli();

    expect(result).toBe(testPath);
  });

  it('should check common installation paths if not in PATH', async () => {
    delete process.env.CLAUDE_CLI_PATH;
    process.env.HOME = '/home/testuser';

    // Mock existsSync to return true for ~/.claude/local/claude
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      return path === '/home/testuser/.claude/local/claude';
    });

    const result = await detectCli();

    expect(result).toBe('/home/testuser/.claude/local/claude');
  });

  it('should return null if CLI is not found anywhere', async () => {
    delete process.env.CLAUDE_CLI_PATH;

    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await detectCli();

    expect(result).toBe(null);
  });
});
