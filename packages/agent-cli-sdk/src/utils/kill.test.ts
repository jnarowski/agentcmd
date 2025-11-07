import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { killProcess } from './kill';

describe('killProcess', () => {
  it('should kill process with SIGTERM', async () => {
    // Spawn a long-running process
    const proc = spawn('sleep', ['10']);

    const result = await killProcess(proc, { timeoutMs: 100 });

    expect(result.killed).toBe(true);
    expect(result.signal).toBe('SIGTERM');
  });

  it('should kill process within timeout period', async () => {
    // Spawn a long-running process
    const proc = spawn('sleep', ['60']);

    // Give process time to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    const startTime = Date.now();
    const result = await killProcess(proc, { timeoutMs: 1000 });
    const duration = Date.now() - startTime;

    // Process should be killed
    expect(result.killed).toBe(true);
    // Should complete within reasonable time (much less than 60s sleep)
    expect(duration).toBeLessThan(6000);
    // Signal should be either SIGTERM or SIGKILL
    expect(['SIGTERM', 'SIGKILL']).toContain(result.signal);
  });

  it('should handle already-dead process', async () => {
    // Spawn a process that exits immediately
    const proc = spawn('node', ['-e', 'process.exit(0)']);

    // Wait for process to exit
    await new Promise((resolve) => proc.on('close', resolve));

    const result = await killProcess(proc);

    expect(result.killed).toBe(false);
  });

  it('should use default timeout of 5000ms', async () => {
    const proc = spawn('sleep', ['10']);

    // Don't specify timeout - should use default 5000ms
    const result = await killProcess(proc);

    expect(result.killed).toBe(true);
    expect(result.signal).toBe('SIGTERM');
  });
});
