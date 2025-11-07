import { describe, it, expect } from 'vitest';
import { permissionModeToFlags, workingDirToFlags } from './argBuilding';
import type { PermissionMode } from '../types/permissions';

describe('argBuilding', () => {
  describe('permissionModeToFlags', () => {
    it('should return empty array for undefined mode', () => {
      expect(permissionModeToFlags(undefined)).toEqual([]);
    });

    it('should return empty array for "default" mode', () => {
      expect(permissionModeToFlags('default')).toEqual([]);
    });

    it('should return ["--plan"] for "plan" mode', () => {
      expect(permissionModeToFlags('plan')).toEqual(['--plan']);
    });

    it('should return ["--accept-edits"] for "acceptEdits" mode', () => {
      expect(permissionModeToFlags('acceptEdits')).toEqual(['--accept-edits']);
    });

    it('should return ["--bypass-permissions"] for "bypassPermissions" mode', () => {
      expect(permissionModeToFlags('bypassPermissions')).toEqual(['--bypass-permissions']);
    });

    it('should handle all valid PermissionMode values', () => {
      const modes: PermissionMode[] = ['default', 'plan', 'acceptEdits', 'bypassPermissions'];

      const results = modes.map((mode) => ({
        mode,
        flags: permissionModeToFlags(mode),
      }));

      expect(results).toEqual([
        { mode: 'default', flags: [] },
        { mode: 'plan', flags: ['--plan'] },
        { mode: 'acceptEdits', flags: ['--accept-edits'] },
        { mode: 'bypassPermissions', flags: ['--bypass-permissions'] },
      ]);
    });

    it('should return array that can be spread into args', () => {
      const baseArgs = ['prompt text'];
      const flagsForPlan = permissionModeToFlags('plan');
      const flagsForAcceptEdits = permissionModeToFlags('acceptEdits');

      expect([...baseArgs, ...flagsForPlan]).toEqual(['prompt text', '--plan']);
      expect([...baseArgs, ...flagsForAcceptEdits]).toEqual(['prompt text', '--accept-edits']);
    });
  });

  describe('workingDirToFlags', () => {
    it('should return empty array for undefined cwd', () => {
      expect(workingDirToFlags(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(workingDirToFlags('')).toEqual([]);
    });

    it('should return ["--cwd", path] for valid path', () => {
      expect(workingDirToFlags('/path/to/dir')).toEqual(['--cwd', '/path/to/dir']);
    });

    it('should handle absolute paths', () => {
      expect(workingDirToFlags('/usr/local/project')).toEqual(['--cwd', '/usr/local/project']);
    });

    it('should handle relative paths', () => {
      expect(workingDirToFlags('./project')).toEqual(['--cwd', './project']);
      expect(workingDirToFlags('../parent')).toEqual(['--cwd', '../parent']);
    });

    it('should handle paths with spaces', () => {
      expect(workingDirToFlags('/path with spaces/project')).toEqual(['--cwd', '/path with spaces/project']);
    });

    it('should handle Windows paths', () => {
      expect(workingDirToFlags('C:\\Users\\Project')).toEqual(['--cwd', 'C:\\Users\\Project']);
    });

    it('should return array that can be spread into args', () => {
      const baseArgs = ['prompt text'];
      const flags = workingDirToFlags('/project/path');

      expect([...baseArgs, ...flags]).toEqual(['prompt text', '--cwd', '/project/path']);
    });
  });

  describe('combined usage', () => {
    it('should combine both utilities for full arg building', () => {
      const prompt = 'implement feature';
      const cwd = '/project/root';
      const mode: PermissionMode = 'acceptEdits';

      const args = [prompt, ...workingDirToFlags(cwd), ...permissionModeToFlags(mode)];

      expect(args).toEqual(['implement feature', '--cwd', '/project/root', '--accept-edits']);
    });

    it('should work with no optional flags', () => {
      const prompt = 'implement feature';

      const args = [prompt, ...workingDirToFlags(undefined), ...permissionModeToFlags(undefined)];

      expect(args).toEqual(['implement feature']);
    });

    it('should work with only cwd', () => {
      const prompt = 'implement feature';
      const cwd = '/project';

      const args = [prompt, ...workingDirToFlags(cwd), ...permissionModeToFlags(undefined)];

      expect(args).toEqual(['implement feature', '--cwd', '/project']);
    });

    it('should work with only permission mode', () => {
      const prompt = 'implement feature';
      const mode: PermissionMode = 'plan';

      const args = [prompt, ...workingDirToFlags(undefined), ...permissionModeToFlags(mode)];

      expect(args).toEqual(['implement feature', '--plan']);
    });

    it('should produce args in correct order for CLI', () => {
      const prompt = 'write tests';
      const cwd = '/app';
      const mode: PermissionMode = 'bypassPermissions';
      const toolSpecificArgs = ['--verbose', '--output', 'result.txt'];

      const args = [prompt, ...workingDirToFlags(cwd), ...permissionModeToFlags(mode), ...toolSpecificArgs];

      expect(args).toEqual([
        'write tests',
        '--cwd',
        '/app',
        '--bypass-permissions',
        '--verbose',
        '--output',
        'result.txt',
      ]);
    });
  });
});
