import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execute } from '../../../src/claude/execute';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import type { ChildProcess } from 'node:child_process';

describe('E2E: MCP Config', () => {
  const testDir = process.cwd();
  const mcpConfigPath = join(testDir, '.mcp.json.test');

  beforeAll(() => {
    // Create a minimal test MCP config file
    // Using echo command as a simple no-op MCP server for testing
    const mcpConfig = {
      mcpServers: {
        test: {
          command: 'echo',
          args: ['MCP server initialized'],
        },
      },
    };
    writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  });

  afterAll(() => {
    // Cleanup test MCP config
    if (existsSync(mcpConfigPath)) {
      unlinkSync(mcpConfigPath);
    }
  });

  it('should pass --mcp-config flags to Claude CLI', async () => {
    let cliArgs: string[] = [];

    const result = await execute({
      prompt: 'What is 2+2? Just answer with the number.',
      mcpConfig: ['.mcp.json.test'],
      workingDir: testDir,
      permissionMode: 'acceptEdits',
      timeout: 60000,
      // @ts-expect-error - onStart is optional but not in type signature
      onStart: (process: ChildProcess) => {
        // Capture CLI arguments
        cliArgs = process.spawnargs || [];
      },
    });

    // Verify execution succeeds with MCP config
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBeTruthy();
    expect(result.data).toBeTruthy();

    // Verify --mcp-config flag was passed to CLI
    expect(cliArgs).toContain('--mcp-config');
    const mcpConfigIndex = cliArgs.indexOf('--mcp-config');
    expect(mcpConfigIndex).toBeGreaterThan(-1);
    expect(cliArgs[mcpConfigIndex + 1]).toBe('.mcp.json.test');
  }, 120000);

  it('should pass multiple --mcp-config values to Claude CLI', async () => {
    let cliArgs: string[] = [];

    const result = await execute({
      prompt: 'Say hello',
      mcpConfig: ['.mcp.json.test', '.mcp.json.test'], // Same config twice for testing
      workingDir: testDir,
      permissionMode: 'acceptEdits',
      timeout: 60000,
      // @ts-expect-error - onStart is optional but not in type signature
      onStart: (process: ChildProcess) => {
        cliArgs = process.spawnargs || [];
      },
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);

    // Verify --mcp-config flag followed by both config paths
    expect(cliArgs).toContain('--mcp-config');
    const mcpConfigIndex = cliArgs.indexOf('--mcp-config');
    expect(cliArgs[mcpConfigIndex + 1]).toBe('.mcp.json.test');
    expect(cliArgs[mcpConfigIndex + 2]).toBe('.mcp.json.test');
  }, 120000);

  it('should work without mcpConfig (backwards compatibility)', async () => {
    const result = await execute({
      prompt: 'What is the capital of France? Just answer with the city name.',
      workingDir: testDir,
      permissionMode: 'acceptEdits',
      timeout: 60000,
      // No mcpConfig parameter
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  }, 120000);

  it('should handle empty mcpConfig array', async () => {
    const result = await execute({
      prompt: 'Count from 1 to 3',
      mcpConfig: [], // Empty array
      workingDir: testDir,
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  }, 120000);

  it('should handle relative paths in mcpConfig', async () => {
    const result = await execute({
      prompt: 'Say "test complete"',
      mcpConfig: ['./.mcp.json.test'], // Relative path with ./
      workingDir: testDir,
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  }, 120000);
});
