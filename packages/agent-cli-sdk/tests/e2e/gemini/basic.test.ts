/**
 * E2E tests for Gemini CLI integration - Basic execution.
 *
 * These tests require Gemini CLI to be installed.
 * Set GEMINI_CLI_PATH environment variable to specify the CLI location.
 */

import { describe, it, expect } from 'vitest';
import { execute } from '../../../src/gemini/execute';
import { detectCli } from '../../../src/gemini/detectCli';

describe('E2E: Basic Gemini CLI Execution', () => {
  it('should execute a comprehensive prompt and validate output structure', async () => {
    const cliPath = detectCli();

    // Skip if CLI not installed
    if (!cliPath) {
      console.warn('Gemini CLI not found. Skipping E2E tests.');
      return;
    }

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let closeExitCode: number | undefined;

    // Single comprehensive test with all features
    const result = await execute({
      prompt: `Please answer the following questions:
1. What is 2+2? (Answer with just the number)
2. Say "hello" to test basic text output
3. What is the capital of France? (Just the city name)
4. Say "test complete" to verify execution`,
      permissionMode: 'acceptEdits',
      timeout: 60000,
      onStdout: (chunk) => {
        stdoutChunks.push(chunk);
        expect(typeof chunk).toBe('string');
      },
      onStderr: (chunk) => {
        stderrChunks.push(chunk);
        expect(typeof chunk).toBe('string');
      },
      onClose: (exitCode) => {
        closeExitCode = exitCode;
        expect(typeof exitCode).toBe('number');
      },
    });

    console.log('result sessionId', result.sessionId);

    // Skip test if quota exceeded
    if (result.error?.includes('Quota exceeded') || result.error?.includes('rate limit')) {
      console.warn('Gemini API quota exceeded. Skipping E2E tests.');
      return;
    }

    // Verify execution success
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeGreaterThan(0);

    // Verify messages structure
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThanOrEqual(0);

    // Verify text data extraction
    expect(result.data).toBeTruthy();
    expect(typeof result.data).toBe('string');

    // Verify response contains expected content
    const dataStr = result.data as string;
    expect(dataStr.toLowerCase()).toContain('4'); // Answer to 2+2
    expect(dataStr.toLowerCase()).toContain('hello');
    expect(dataStr.toLowerCase()).toContain('paris');
    expect(dataStr.toLowerCase()).toContain('test complete');

    // Verify callbacks were triggered
    expect(stdoutChunks.length).toBeGreaterThan(0);
    expect(closeExitCode).toBe(0);
  }, 120000); // 2 minute timeout
});
