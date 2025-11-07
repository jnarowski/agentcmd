import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { execute } from '../../../src/codex/execute';

describe('E2E: Basic CLI Execution', () => {
  it('should execute prompts with various features and validate output structure', async () => {
    const events: unknown[] = [];
    const stdoutCalls: number[] = [];

    // Test 1: Basic execution with callbacks and message validation
    const result = await execute({
      prompt: 'What is 2+2? Answer with just the number.',
      permissionMode: 'acceptEdits',
      timeout: 60000,
      onEvent: (data) => {
        events.push(data.event);
        // Verify callback structure
        expect(data).toHaveProperty('raw');
        expect(data).toHaveProperty('event');
        expect(data).toHaveProperty('message');
      },
      onStdout: (data) => {
        stdoutCalls.push(data.messages.length);
        // Verify accumulated data structure
        expect(data).toHaveProperty('raw');
        expect(data).toHaveProperty('events');
        expect(data).toHaveProperty('messages');
        expect(Array.isArray(data.messages)).toBe(true);
      },
    });

    // Verify execution success
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBeTruthy();
    expect(result.duration).toBeGreaterThan(0);

    // Verify messages structure
    expect(result.messages.length).toBeGreaterThan(0);
    const assistantMessages = result.messages.filter(m => m.role === 'assistant');
    expect(assistantMessages.length).toBeGreaterThan(0);

    // Validate UnifiedMessage structure
    const firstMessage = assistantMessages[0];
    expect(firstMessage).toHaveProperty('role');
    expect(firstMessage).toHaveProperty('content');
    expect(Array.isArray(firstMessage.content)).toBe(true);

    // Verify text data extraction
    expect(result.data).toBeTruthy();
    expect(typeof result.data).toBe('string');

    // Verify callbacks were triggered
    expect(events.length).toBeGreaterThan(0);
    expect(stdoutCalls.length).toBeGreaterThan(0);

    // Verify thread.started event structure (Codex uses thread.started)
    const threadStartedEvent = events.find((e: any) => e.type === 'thread.started') as any;
    expect(threadStartedEvent).toBeDefined();
    expect(threadStartedEvent.thread_id).toBeTruthy();

    // Test 2: Session resumption (use the session from test 1)
    const result2 = await execute({
      prompt: 'What was my first question?',
      sessionId: result.sessionId, // Resume from first session
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(result2.success).toBe(true);
    expect(result2.sessionId).toBe(result.sessionId); // Should be same session
    expect(result2.duration).toBeGreaterThan(0);

    // Test 3: Error callback handling
    let stderrCalled = false;
    const result3 = await execute({
      prompt: 'What is the capital of France? Just answer with the city name.',
      permissionMode: 'default',
      timeout: 60000,
      onStderr: (chunk) => {
        stderrCalled = true;
        expect(typeof chunk).toBe('string');
      },
    });

    expect(result3.success).toBe(true);
    expect(result3.messages.length).toBeGreaterThan(0);
    // stderr may or may not be called depending on CLI output

    // Test 4: Working directory
    const result4 = await execute({
      prompt: 'Say "test complete"',
      workingDir: process.cwd(),
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(result4.success).toBe(true);
    expect(result4.data).toBeTruthy();
  }, 300000); // 5 minute timeout for all 4 tests
});
