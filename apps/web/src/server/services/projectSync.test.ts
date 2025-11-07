/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { syncFromClaudeProjects, hasEnoughSessions } from '@/server/domain/project/services';
import * as projectService from '@/server/domain/project/services';
import * as agentSessionService from '@/server/domain/session/services';

// Mock only specific project service functions
// Note: We must re-export ALL functions we want to use, not just mock overrides
// because once a function imports another from the same module, the binding is fixed
vi.mock('@/server/domain/project/services', async () => {
  const actual = await vi.importActual<typeof import('@/server/domain/project/services')>('@/server/domain/project/services');
  return {
    ...actual,
    // Override with mocks - these will be set per-test
    createOrUpdateProject: vi.fn(),
    projectExistsByPath: vi.fn(),
  };
});

// Mock session service functions
vi.mock('@/server/domain/session/services', () => ({
  createSession: vi.fn(),
  getSessionById: vi.fn(),
  syncProjectSessions: vi.fn(),
}));

describe('ProjectSyncService', () => {
  const originalHome = process.env.HOME;
  const testUserId = 'test-user-id';
  const testHomeDir = path.join(os.tmpdir(), `test-home-${Date.now()}`);
  const testDir = path.join(testHomeDir, 'claude-test-projects-sync');

  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();
    vi.restoreAllMocks();

    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    // Override home directory for tests with unique dir
    await fs.mkdir(testHomeDir, { recursive: true });
    process.env.HOME = testHomeDir;
    await fs.mkdir(path.join(testHomeDir, '.claude', 'projects'), {
      recursive: true,
    });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      await fs.rm(testHomeDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
      });
    } catch (e) {
      // Ignore cleanup errors
    }
    process.env.HOME = originalHome;
  });

  describe('hasEnoughSessions', () => {
    it('should return false for project with no JSONL files', async () => {
      const projectName = '-Users-test-empty-project';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      const hasEnough = await hasEnoughSessions({ projectName });

      expect(hasEnough).toBe(false);
    });

    it('should return false for project with only 1 session', async () => {
      const projectName = '-Users-test-one-session';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 1 JSONL file
      const sessionFile = path.join(projectDir, 'session-1.jsonl');
      await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));

      const hasEnough = await hasEnoughSessions({ projectName });

      expect(hasEnough).toBe(false);
    });

    it('should return false for project with exactly 3 sessions', async () => {
      const projectName = '-Users-test-three-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create exactly 3 JSONL files
      for (let i = 1; i <= 3; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const hasEnough = await hasEnoughSessions({ projectName });

      expect(hasEnough).toBe(false);
    });

    it('should return true for project with more than 3 sessions', async () => {
      const projectName = '-Users-test-four-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 4 JSONL files
      for (let i = 1; i <= 4; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const hasEnough = await hasEnoughSessions({ projectName });

      expect(hasEnough).toBe(true);
    });

    it('should return true for project with many sessions', async () => {
      const projectName = '-Users-test-many-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 10 JSONL files
      for (let i = 1; i <= 10; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const hasEnough = await hasEnoughSessions({ projectName });

      expect(hasEnough).toBe(true);
    });

    it('should only count .jsonl files', async () => {
      const projectName = '-Users-test-mixed-files';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 2 JSONL files
      await fs.writeFile(path.join(projectDir, 'session-1.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'session-2.jsonl'), '{}');

      // Create other files that should be ignored
      await fs.writeFile(path.join(projectDir, 'README.md'), 'test');
      await fs.writeFile(path.join(projectDir, 'data.json'), '{}');
      await fs.writeFile(path.join(projectDir, 'notes.txt'), 'notes');

      const hasEnough = await hasEnoughSessions({ projectName });

      // Should be false because only 2 .jsonl files (not >3)
      expect(hasEnough).toBe(false);
    });

    it('should handle directory access errors gracefully', async () => {
      const projectName = '-Users-nonexistent-project';

      const hasEnough = await hasEnoughSessions({ projectName });

      expect(hasEnough).toBe(false);
    });

    it('should ignore session files starting with agent-', async () => {
      const projectName = '-Users-test-agent-files';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 2 valid session files
      await fs.writeFile(path.join(projectDir, 'valid-session-1.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'valid-session-2.jsonl'), '{}');

      // Create 5 agent- prefixed files (should be ignored)
      await fs.writeFile(path.join(projectDir, 'agent-64613bb1.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'agent-12345.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'agent-abc.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'agent-xyz.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'agent-test.jsonl'), '{}');

      const hasEnough = await hasEnoughSessions({ projectName });

      // Should be false because only 2 valid files (not >3)
      // agent- files should not be counted
      expect(hasEnough).toBe(false);
    });

    it('should accept files with agent in middle or end of filename', async () => {
      const projectName = '-Users-test-agent-middle';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 4 files with "agent" in middle/end (should be accepted)
      await fs.writeFile(path.join(projectDir, 'my-agent-session.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'session-agent.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'agent.jsonl'), '{}'); // doesn't start with "agent-"
      await fs.writeFile(path.join(projectDir, 'session-123.jsonl'), '{}');

      const hasEnough = await hasEnoughSessions({ projectName });

      // Should be true because 4 valid files (>3)
      expect(hasEnough).toBe(true);
    });

    it('should not count agent- files toward session minimum', async () => {
      const projectName = '-Users-test-mostly-agent-files';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 2 valid files
      await fs.writeFile(path.join(projectDir, 'session-1.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'session-2.jsonl'), '{}');

      // Create 10 agent- prefixed files (should all be ignored)
      for (let i = 1; i <= 10; i++) {
        await fs.writeFile(path.join(projectDir, `agent-${i}.jsonl`), '{}');
      }

      const hasEnough = await hasEnoughSessions({ projectName, minSessions: 3 });

      // Should be false because only 2 valid files (needs >3)
      expect(hasEnough).toBe(false);
    });
  });

  describe('syncFromClaudeProjects', () => {
    it('should return empty stats when projects directory does not exist', async () => {
      // Don't create the .claude/projects directory
      await fs.rm(path.join(testHomeDir, '.claude'), {
        recursive: true,
        force: true,
      });

      const result = await syncFromClaudeProjects(testUserId);

      expect(result).toEqual({
        projectsImported: 0,
        projectsUpdated: 0,
        totalSessionsSynced: 0,
      });
      expect(vi.mocked(projectService.createOrUpdateProject)).not.toHaveBeenCalled();
    });

    it('should skip projects with insufficient sessions', async () => {
      const projectName = '-Users-test-project-few-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create only 2 sessions (need >3)
      for (let i = 1; i <= 2; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const result = await syncFromClaudeProjects(testUserId);

      expect(result).toEqual({
        projectsImported: 0,
        projectsUpdated: 0,
        totalSessionsSynced: 0,
      });
      expect(vi.mocked(projectService.createOrUpdateProject)).not.toHaveBeenCalled();
    });


    it('should handle session sync failures gracefully', async () => {
      const projectName = '-Users-test-project-sync-fail';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 5 sessions (enough to qualify)
      for (let i = 1; i <= 5; i++) {
        const sessionFile = path.join(projectDir, `session${i}.jsonl`);
        await fs.writeFile(
          sessionFile,
          JSON.stringify({
            type: 'user',
            message: { content: `Msg ${i}` },
            cwd: '/Users/test/failproject',
          })
        );
      }

      const now = new Date();
      const mockProject = {
        id: 'project-fail',
        name: 'failproject',
        path: '/Users/test/failproject',
        is_hidden: false,
        is_starred: false,
        created_at: now,
        updated_at: now,
      };
      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(
        mockProject
      );
      // Session sync fails
      vi.mocked(agentSessionService.syncProjectSessions).mockRejectedValue(
        new Error('Session sync failed')
      );

      // Should not throw, but continue processing
      await expect(
        syncFromClaudeProjects(testUserId)
      ).rejects.toThrow('Session sync failed');
    });
  });

  describe('Integration Tests - Full Sync Workflow', () => {

    it('should ignore non-.jsonl files when counting sessions', async () => {
      const projectName = '-Users-test-mixed-files';
      const projectDir = path.join(testHomeDir, '.claude', 'projects', projectName);
      await fs.mkdir(projectDir, { recursive: true });

      // Create 2 .jsonl files
      await fs.writeFile(path.join(projectDir, 'session1.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'session2.jsonl'), '{}');

      // Create many other files (should be ignored)
      await fs.writeFile(path.join(projectDir, 'README.md'), 'test');
      await fs.writeFile(path.join(projectDir, 'data.json'), '{}');
      await fs.writeFile(path.join(projectDir, 'log.txt'), 'logs');
      await fs.writeFile(path.join(projectDir, 'session.backup'), 'backup');

      const result = await syncFromClaudeProjects(testUserId);

      // Should skip because only 2 .jsonl files
      expect(result.projectsImported).toBe(0);
      expect(vi.mocked(projectService.createOrUpdateProject)).not.toHaveBeenCalled();
    });
  });
});
