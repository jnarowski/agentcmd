import { describe, it, expect } from 'vitest';
import { execute } from '../../../src/codex/execute';

describe('E2E: JSON Extraction', () => {
  it('should extract JSON from responses and handle various formats correctly', async () => {
    // Test 1: Simple JSON object extraction
    const result1 = await execute<{ name: string; age: number }>({
      prompt: `Return exactly this JSON object with no other text:
{"name": "Alice", "age": 30}`,
      permissionMode: 'acceptEdits',
      timeout: 60000,
      json: true,
    });

    expect(result1.success).toBe(true);
    expect(result1.exitCode).toBe(0);
    expect(result1.data).toEqual({ name: 'Alice', age: 30 });

    // Test 2: JSON array with type safety
    const result2 = await execute<Array<{ id: number; name: string }>>({
      prompt: `Return exactly this JSON array with no other text:
[{"id": 1, "name": "first"}, {"id": 2, "name": "second"}]`,
      permissionMode: 'acceptEdits',
      timeout: 60000,
      json: true,
    });

    expect(result2.success).toBe(true);
    expect(Array.isArray(result2.data)).toBe(true);
    expect(result2.data).toHaveLength(2);
    expect(result2.data[0]).toEqual({ id: 1, name: 'first' });
    expect(result2.data[1]).toEqual({ id: 2, name: 'second' });

    // Test 3: Complex nested JSON structure
    const result3 = await execute<{
      user: { id: number; profile: { name: string; active: boolean } };
    }>({
      prompt: `Return exactly this JSON with no other text:
{"user": {"id": 100, "profile": {"name": "Bob", "active": true}}}`,
      permissionMode: 'acceptEdits',
      timeout: 60000,
      json: true,
    });

    expect(result3.success).toBe(true);
    expect(result3.data).toHaveProperty('user');
    expect(result3.data.user.id).toBe(100);
    expect(result3.data.user.profile).toEqual({ name: 'Bob', active: true });

    // Test 4: JSON in markdown code blocks (common AI response pattern)
    const result4 = await execute<{ value: number }>({
      prompt: 'Output {"value": 123} in a JSON code block',
      permissionMode: 'acceptEdits',
      timeout: 60000,
      json: true,
    });

    expect(result4.success).toBe(true);
    expect(result4.data).toEqual({ value: 123 });

    // Test 5: Critical - Graceful fallback when no JSON present
    const result5 = await execute({
      prompt: 'Just say hello with no JSON',
      permissionMode: 'acceptEdits',
      timeout: 60000,
      json: true, // Request JSON but won't get it
    });

    expect(result5.success).toBe(true);
    // Should fallback to text string, not throw error
    expect(typeof result5.data).toBe('string');
    expect((result5.data as string).toLowerCase()).toContain('hello');

    // Test 6: Verify json:false returns raw text
    const result6 = await execute({
      prompt: 'Count from 1 to 3',
      permissionMode: 'acceptEdits',
      timeout: 60000,
      json: false, // Explicitly no JSON extraction
    });

    expect(result6.success).toBe(true);
    expect(typeof result6.data).toBe('string');
    expect(result6.data).toBeTruthy();
    // Should be text, not parsed JSON
    expect(typeof result6.data).not.toBe('object');
  }, 480000); // 8 minute timeout for all 6 tests
});
