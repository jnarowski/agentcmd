import { describe, it, expect } from 'vitest';
import { execute } from '../../../src/index';
import { randomUUID } from 'crypto';

describe('Claude Session Resume E2E', () => {
  it('should maintain context across multiple executions using session resume', async () => {
    // Generate a unique session ID
    const sessionId = randomUUID();
    const testName = 'Tony';

    // Step 1: Create a new session and tell Claude a name
    const result1 = await execute({
      tool: 'claude',
      prompt: `Hi! My name is ${testName}. Please remember that.`,
      sessionId,
      verbose: false,
    });

    expect(result1.success).toBe(true);
    expect(result1.exitCode).toBe(0);
    expect(result1.sessionId).toBe(sessionId);
    expect(result1.messages.length).toBeGreaterThan(0);

    // Step 2: Resume the session and ask Claude to recall the name
    const result2 = await execute({
      tool: 'claude',
      prompt: 'What is my name? Please answer with just the name, nothing else.',
      sessionId: result1.sessionId,
      resume: true,
      verbose: false,
    });

    expect(result2.success).toBe(true);
    expect(result2.exitCode).toBe(0);
    expect(result2.sessionId).toBe(sessionId);
    expect(result2.messages.length).toBeGreaterThan(0);

    // Verify Claude remembered the name
    const response = result2.data as string;
    expect(response.toLowerCase()).toContain(testName.toLowerCase());

    // Step 3: Ask a follow-up question in the same session
    const result3 = await execute({
      tool: 'claude',
      prompt: 'Can you spell my name backwards? Just the backwards spelling, nothing else.',
      sessionId: result2.sessionId,
      resume: true,
      verbose: false,
    });

    expect(result3.success).toBe(true);
    expect(result3.exitCode).toBe(0);
    expect(result3.sessionId).toBe(sessionId);

    // Verify Claude still has context
    const backwardsName = testName.split('').reverse().join('');
    const response3 = result3.data as string;
    expect(response3.toLowerCase()).toContain(backwardsName.toLowerCase());

    // All three results should use the same session
    expect(result1.sessionId).toBe(result2.sessionId);
    expect(result2.sessionId).toBe(result3.sessionId);
  });

  it('should create independent sessions with different session IDs', async () => {
    const sessionId1 = randomUUID();
    const sessionId2 = randomUUID();

    // Create first session
    const result1 = await execute({
      tool: 'claude',
      prompt: 'My favorite color is blue.',
      sessionId: sessionId1,
      verbose: false,
    });

    expect(result1.success).toBe(true);
    expect(result1.sessionId).toBe(sessionId1);

    // Create second independent session
    const result2 = await execute({
      tool: 'claude',
      prompt: 'What is my favorite color?',
      sessionId: sessionId2,
      verbose: false,
    });

    expect(result2.success).toBe(true);
    expect(result2.sessionId).toBe(sessionId2);

    // Second session should NOT know about the first session's context
    const response = result2.data as string;
    expect(response.toLowerCase()).not.toContain('blue');

    // Session IDs should be different
    expect(result1.sessionId).not.toBe(result2.sessionId);
  });

  it('should allow resuming a session multiple times', async () => {
    const sessionId = randomUUID();
    let previousSessionId = sessionId;

    // Create initial session
    const result1 = await execute({
      tool: 'claude',
      prompt: 'Count to 1 and remember we are counting.',
      sessionId,
      verbose: false,
    });

    expect(result1.success).toBe(true);
    previousSessionId = result1.sessionId;

    // Resume and continue counting 3 more times
    for (let i = 2; i <= 4; i++) {
      const result = await execute({
        tool: 'claude',
        prompt: `Continue counting. What number comes after ${i - 1}?`,
        sessionId: previousSessionId,
        resume: true,
        verbose: false,
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);

      const response = result.data as string;
      expect(response).toContain(String(i));

      previousSessionId = result.sessionId;
    }
  });
});
