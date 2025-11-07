import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { getProjectSlashCommands } from '@/server/domain/project/services/getProjectSlashCommands';
import * as projectService from '@/server/domain/project/services';
import { vi } from 'vitest';

// Mock the project service
vi.mock('@/server/domain/project/services', () => ({
  getProjectById: vi.fn(),
}));

describe('slash-command.service', () => {
  const testProjectId = 'test-project-id';
  const testProjectPath = path.join(__dirname, '__test-fixtures__', 'test-project');
  const commandsDir = path.join(testProjectPath, '.claude', 'commands');

  beforeEach(async () => {
    // Mock project service to return test project
    vi.mocked(projectService).getProjectById.mockResolvedValue({
      id: testProjectId,
      path: testProjectPath,
      name: 'Test Project',
      is_hidden: false,
        is_starred: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create test directory structure
    await fs.mkdir(commandsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test fixtures
    await fs.rm(path.join(__dirname, '__test-fixtures__'), {
      recursive: true,
      force: true,
    });
    vi.clearAllMocks();
  });

  describe('argumentHints parsing', () => {
    it('should parse argument hints from YAML array format', async () => {
      // Create test command file with YAML array format
      const commandContent = `---
description: Test command with array format
argument-hint: [arg1, arg2, arg3]
---

# Test Command
`;

      await fs.writeFile(
        path.join(commandsDir, 'test-command.md'),
        commandContent
      );

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({
        name: 'test-command',
        fullCommand: '/test-command',
        description: 'Test command with array format',
        argumentHints: ['arg1', 'arg2', 'arg3'],
        type: 'custom',
      });
    });

    it('should parse argument hints from string format', async () => {
      // Create test command file with string format
      const commandContent = `---
description: Test command with string format
argument-hint: "[arg1, arg2, arg3]"
---

# Test Command
`;

      await fs.writeFile(
        path.join(commandsDir, 'test-string.md'),
        commandContent
      );

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({
        name: 'test-string',
        fullCommand: '/test-string',
        description: 'Test command with string format',
        argumentHints: ['arg1', 'arg2', 'arg3'],
        type: 'custom',
      });
    });

    it('should handle commands without argument hints', async () => {
      const commandContent = `---
description: Test command without hints
---

# Test Command
`;

      await fs.writeFile(
        path.join(commandsDir, 'no-hints.md'),
        commandContent
      );

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({
        name: 'no-hints',
        fullCommand: '/no-hints',
        description: 'Test command without hints',
        type: 'custom',
      });
      expect(commands[0].argumentHints).toBeUndefined();
    });

    it('should handle camelCase argumentHint field', async () => {
      const commandContent = `---
description: Test command with camelCase field
argumentHint: [camelCase, field, test]
---

# Test Command
`;

      await fs.writeFile(
        path.join(commandsDir, 'camel-case.md'),
        commandContent
      );

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0].argumentHints).toEqual(['camelCase', 'field', 'test']);
    });

    it('should trim whitespace from argument hints', async () => {
      const commandContent = `---
description: Test command with whitespace
argument-hint: [ arg1 , arg2 , arg3 ]
---

# Test Command
`;

      await fs.writeFile(
        path.join(commandsDir, 'whitespace.md'),
        commandContent
      );

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0].argumentHints).toEqual(['arg1', 'arg2', 'arg3']);
    });

    it('should handle single argument hint', async () => {
      const commandContent = `---
description: Test command with single hint
argument-hint: [singleArg]
---

# Test Command
`;

      await fs.writeFile(
        path.join(commandsDir, 'single.md'),
        commandContent
      );

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0].argumentHints).toEqual(['singleArg']);
    });
  });

  describe('namespaced commands', () => {
    it('should construct namespaced command names from subdirectories', async () => {
      const e2eDir = path.join(commandsDir, 'e2e');
      await fs.mkdir(e2eDir, { recursive: true });

      const commandContent = `---
description: E2E test command
argument-hint: [testName]
---

# E2E Test
`;

      await fs.writeFile(path.join(e2eDir, 'test.md'), commandContent);

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({
        name: 'e2e:test',
        fullCommand: '/e2e:test',
        description: 'E2E test command',
        argumentHints: ['testName'],
        type: 'custom',
      });
    });

    it('should handle deeply nested namespaces', async () => {
      const nestedDir = path.join(commandsDir, 'foo', 'bar', 'baz');
      await fs.mkdir(nestedDir, { recursive: true });

      const commandContent = `---
description: Deeply nested command
---

# Nested Command
`;

      await fs.writeFile(path.join(nestedDir, 'deep.md'), commandContent);

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({
        name: 'foo:bar:baz:deep',
        fullCommand: '/foo:bar:baz:deep',
        description: 'Deeply nested command',
        type: 'custom',
      });
    });
  });

  describe('error handling', () => {
    it('should skip commands without description', async () => {
      const commandContent = `---
argument-hint: [arg1]
---

# No Description
`;

      await fs.writeFile(
        path.join(commandsDir, 'no-desc.md'),
        commandContent
      );

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toHaveLength(0);
    });

    it('should return empty array if commands directory does not exist', async () => {
      // Remove the commands directory
      await fs.rm(commandsDir, { recursive: true, force: true });

      const commands = await getProjectSlashCommands(testProjectId);

      expect(commands).toEqual([]);
    });

    it('should throw error if project not found', async () => {
      vi.mocked(projectService.getProjectById).mockResolvedValue(null);

      await expect(
        getProjectSlashCommands('non-existent-project')
      ).rejects.toThrow('Project not found');
    });
  });
});
