import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve, join } from 'path';
import { mkdir, copyFile, rm } from 'fs/promises';
import { loadSession } from './loadSession';
import { tmpdir } from 'os';

const REAL_SESSION_PATH = resolve(__dirname, '../../tests/fixtures/claude/full/full-session.jsonl');
const TEST_SESSION_ID = 'test-session-id';

describe('loadSession', () => {
  let testProjectPath: string;
  let testClaudeProjectDir: string;

  beforeEach(async () => {
    // Create a temporary project directory
    testProjectPath = join(tmpdir(), 'test-project-' + Date.now());

    // Encode the project path (replace / with -)
    const encodedPath = testProjectPath.replace(/\//g, '-');
    testClaudeProjectDir = join(process.env.HOME || tmpdir(), '.claude', 'projects', encodedPath);

    // Create the Claude project directory
    await mkdir(testClaudeProjectDir, { recursive: true });

    // Copy sample session file to the test location
    await copyFile(REAL_SESSION_PATH, join(testClaudeProjectDir, `${TEST_SESSION_ID}.jsonl`));
  });

  afterEach(async () => {
    // Cleanup test directory
    await rm(testClaudeProjectDir, { recursive: true, force: true });
  });

  it('should load messages from Claude session file', async () => {
    const messages = await loadSession({
      sessionId: TEST_SESSION_ID,
      projectPath: testProjectPath,
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]?.tool).toBe('claude');

    // Check that messages are sorted by timestamp
    for (let i = 1; i < messages.length; i++) {
      const currentTimestamp = messages[i]?.timestamp;
      const previousTimestamp = messages[i - 1]?.timestamp;
      if (currentTimestamp !== undefined && previousTimestamp !== undefined) {
        expect(currentTimestamp).toBeGreaterThanOrEqual(previousTimestamp);
      }
    }
  });

  it('should parse all message types correctly', async () => {
    const messages = await loadSession({
      sessionId: TEST_SESSION_ID,
      projectPath: testProjectPath,
    });

    // Should have both user and assistant messages
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    expect(userMessages.length).toBeGreaterThan(0);
    expect(assistantMessages.length).toBeGreaterThan(0);
  });

  it('should preserve original format in messages', async () => {
    const messages = await loadSession({
      sessionId: TEST_SESSION_ID,
      projectPath: testProjectPath,
    });

    expect(messages[0]?._original).toBeDefined();
    expect(typeof messages[0]?._original).toBe('object');
  });

  it('should return empty array for missing session file', async () => {
    const messages = await loadSession({
      sessionId: 'nonexistent-session',
      projectPath: testProjectPath,
    });

    expect(messages).toEqual([]);
  });

  it('should return empty array for missing project', async () => {
    const messages = await loadSession({
      sessionId: TEST_SESSION_ID,
      projectPath: '/nonexistent/project/path',
    });

    expect(messages).toEqual([]);
  });
});
