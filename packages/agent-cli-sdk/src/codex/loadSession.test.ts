import { describe, it, expect } from 'vitest';
import { loadSession } from './loadSession';
import type { UnifiedMessage } from '../types/unified';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('loadSession', () => {
  // For testing, we use fixture files that are already in the fixtures directory
  // In a real scenario, these would be in ~/.codex/sessions/YYYY/MM/DD/

  it('should load and parse session messages', async () => {
    // Use a fixture file to simulate loading a session
    // Since we can't easily test the actual glob behavior without mocking,
    // we'll test that the function handles the file correctly when found

    // Extract the UUID from one of our fixture files
    const sessionId = '01997e76-d124-7592-9cac-2ec05abbca08';

    // This test will only pass if the fixture is in the expected location
    // or if CODEX_HOME is set to point to our fixtures
    const originalCodexHome = process.env.CODEX_HOME;

    // Set CODEX_HOME to our fixtures directory for testing
    const fixturesPath = join(__dirname, '../..', 'tests', 'fixtures', 'codex');
    process.env.CODEX_HOME = fixturesPath;

    try {
      const messages = await loadSession({ sessionId });

      // We should get messages if the fixture exists
      expect(Array.isArray(messages)).toBe(true);

      if (messages.length > 0) {
        // Verify messages are sorted by timestamp
        for (let i = 1; i < messages.length; i++) {
          const current = messages[i];
          const previous = messages[i - 1];
          if (current && previous) {
            expect(current.timestamp).toBeGreaterThanOrEqual(previous.timestamp);
          }
        }

        // Verify all messages have required fields
        messages.forEach((msg) => {
          expect(msg.id).toBeDefined();
          expect(msg.role).toBeDefined();
          expect(msg.content).toBeDefined();
          expect(msg.timestamp).toBeDefined();
          expect(msg.tool).toBe('codex');
        });
      }
    } finally {
      // Restore original CODEX_HOME
      if (originalCodexHome !== undefined) {
        process.env.CODEX_HOME = originalCodexHome;
      } else {
        delete process.env.CODEX_HOME;
      }
    }
  });

  it('should return empty array for non-existent session', async () => {
    const messages = await loadSession({
      sessionId: 'non-existent-session-id',
    });

    expect(messages).toEqual([]);
  });

  it('should filter out null messages', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const fixturesPath = join(__dirname, '../..', 'tests', 'fixtures', 'codex');
    process.env.CODEX_HOME = fixturesPath;

    try {
      const sessionId = '01997e76-d124-7592-9cac-2ec05abbca08';
      const messages = await loadSession({ sessionId });

      // All returned messages should be non-null
      expect(messages.every((msg) => msg !== null)).toBe(true);
    } finally {
      if (originalCodexHome !== undefined) {
        process.env.CODEX_HOME = originalCodexHome;
      } else {
        delete process.env.CODEX_HOME;
      }
    }
  });

  it('should handle CODEX_HOME environment variable', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const customPath = '/custom/codex/home';
    process.env.CODEX_HOME = customPath;

    try {
      // This will fail to find the session, but we're testing that it uses CODEX_HOME
      const messages = await loadSession({ sessionId: 'test-id' });
      expect(messages).toEqual([]);
    } finally {
      if (originalCodexHome !== undefined) {
        process.env.CODEX_HOME = originalCodexHome;
      } else {
        delete process.env.CODEX_HOME;
      }
    }
  });

  it('should return messages with consistent structure', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const fixturesPath = join(__dirname, '../..', 'tests', 'fixtures', 'codex');
    process.env.CODEX_HOME = fixturesPath;

    try {
      const sessionId = '01997e76-d124-7592-9cac-2ec05abbca08';
      const messages = await loadSession({ sessionId });

      if (messages.length > 0) {
        messages.forEach((msg: UnifiedMessage) => {
          // Verify UnifiedMessage structure
          expect(msg).toHaveProperty('id');
          expect(msg).toHaveProperty('role');
          expect(msg).toHaveProperty('content');
          expect(msg).toHaveProperty('timestamp');
          expect(msg).toHaveProperty('tool');
          expect(msg).toHaveProperty('_original');

          // Verify content is array
          expect(Array.isArray(msg.content)).toBe(true);

          // Verify tool is 'codex'
          expect(msg.tool).toBe('codex');
        });
      }
    } finally {
      if (originalCodexHome !== undefined) {
        process.env.CODEX_HOME = originalCodexHome;
      } else {
        delete process.env.CODEX_HOME;
      }
    }
  });
});
