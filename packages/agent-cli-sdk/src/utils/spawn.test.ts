import { describe, it, expect, vi } from 'vitest';
import { spawnProcess } from './spawn';

describe('spawnProcess', () => {
  it('should execute command and return stdout', async () => {
    const result = await spawnProcess('echo', {
      args: ['hello'],
    });

    expect(result.stdout.trim()).toBe('hello');
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should capture stderr', async () => {
    const result = await spawnProcess('node', {
      args: ['-e', 'console.error("error message")'],
    });

    expect(result.stderr.trim()).toBe('error message');
    expect(result.exitCode).toBe(0);
  });

  it('should call onStdout callback', async () => {
    const onStdout = vi.fn();

    await spawnProcess('echo', {
      args: ['test'],
      onStdout,
    });

    expect(onStdout).toHaveBeenCalledWith(expect.stringContaining('test'));
  });

  it('should call onStderr callback', async () => {
    const onStderr = vi.fn();

    await spawnProcess('node', {
      args: ['-e', 'console.error("error")'],
      onStderr,
    });

    expect(onStderr).toHaveBeenCalledWith(expect.stringContaining('error'));
  });

  it('should handle command not found', async () => {
    await expect(
      spawnProcess('nonexistent-command-xyz', {
        args: [],
      })
    ).rejects.toThrow();
  });

  it('should handle non-zero exit codes', async () => {
    const result = await spawnProcess('node', {
      args: ['-e', 'process.exit(1)'],
    });

    expect(result.exitCode).toBe(1);
  });

  it('should timeout long-running processes', async () => {
    await expect(
      spawnProcess('node', {
        args: ['-e', 'setTimeout(() => {}, 10000)'],
        timeout: 100,
      })
    ).rejects.toThrow('timeout');
  }, 500);

  it('should respect working directory', async () => {
    const result = await spawnProcess('pwd', {
      args: [],
      cwd: '/tmp',
    });

    // macOS has /tmp as symlink to /private/tmp
    const stdout = result.stdout.trim();
    expect(stdout === '/tmp' || stdout === '/private/tmp').toBe(true);
  });

  it('should pass environment variables', async () => {
    const result = await spawnProcess('node', {
      args: ['-e', 'console.log(process.env.TEST_VAR)'],
      env: { TEST_VAR: 'test-value' },
    });

    expect(result.stdout.trim()).toBe('test-value');
  });
});
