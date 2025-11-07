import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { execute } from '../../../src/codex/execute';

describe('E2E: Session Management', () => {
  it('should handle session creation and resumption correctly', async () => {
    // Test 1: Create a new session with context (simulating user identity)
    const firstResult = await execute({
      prompt: 'My name is Tony. Please acknowledge this and say my name back to me.',
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(firstResult.success).toBe(true);
    expect(firstResult.exitCode).toBe(0);
    expect(firstResult.sessionId).toBeTruthy(); // Codex generates the session ID
    expect(firstResult.messages.length).toBeGreaterThan(0);
    expect(firstResult.duration).toBeGreaterThan(0);

    // Verify the AI acknowledged the name
    const firstResponse = firstResult.data as string;
    expect(firstResponse.toLowerCase()).toContain('tony');

    // Save the session ID from the first execution
    const sessionId = firstResult.sessionId;

    // Test 2: Resume the session and verify context is preserved
    const secondResult = await execute({
      prompt: 'What is my name?',
      sessionId, // Resume using the ID from the first execution
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.sessionId).toBe(sessionId); // Should be same session

    // Critical: Verify context was preserved - AI should remember the name
    const responseText = secondResult.data as string;
    expect(responseText.toLowerCase()).toContain('tony');
  }, 180000); // 3 minute timeout for both tests
});
