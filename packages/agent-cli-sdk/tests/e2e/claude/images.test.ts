import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { execute } from '../../../src/claude/execute';

describe('E2E: Image Upload', () => {
  const fixturesDir = join(process.cwd(), 'tests', 'fixtures', 'images');

  it('should execute with single image path and analyze it', async () => {
    const imagePath = join(fixturesDir, 'test-1x1.png');

    const result = await execute({
      prompt: 'What color is this pixel?',
      images: [{ path: imagePath }],
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    // Verify execution success
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBeTruthy();
    expect(result.duration).toBeGreaterThan(0);

    // Verify messages structure
    expect(result.messages.length).toBeGreaterThan(0);
    const assistantMessages = result.messages.filter((m) => m.role === 'assistant');
    expect(assistantMessages.length).toBeGreaterThan(0);

    // Verify response contains image analysis
    expect(result.data).toBeTruthy();
    expect(typeof result.data).toBe('string');
    // Response should contain color information
    expect(result.data.toLowerCase()).toMatch(/red|color|pixel/);
  }, 180000); // 3 minute timeout

  it('should execute with multiple images', async () => {
    const imagePath1 = join(fixturesDir, 'test-1x1.png');
    const imagePath2 = join(fixturesDir, 'test-1x1.png'); // Same image twice for simplicity

    const result = await execute({
      prompt: 'Describe these images',
      images: [{ path: imagePath1 }, { path: imagePath2 }],
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    // Verify execution success
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);

    // Verify messages structure
    expect(result.messages.length).toBeGreaterThan(0);

    // Verify response contains analysis
    expect(result.data).toBeTruthy();
    expect(typeof result.data).toBe('string');
  }, 180000); // 3 minute timeout
});
