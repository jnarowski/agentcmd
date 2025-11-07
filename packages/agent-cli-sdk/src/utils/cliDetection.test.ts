import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectCliGeneric } from './cliDetection';
import type { CliDetectionConfig } from './cliDetection';
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';

// Mock modules
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('detectCliGeneric', () => {
  const mockExec = vi.mocked(exec);
  const mockExistsSync = vi.mocked(existsSync);

  const baseConfig: CliDetectionConfig = {
    envVar: 'TEST_CLI_PATH',
    commandName: 'testcli',
    commonPaths: ['/usr/local/bin/testcli', '/opt/homebrew/bin/testcli'],
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.TEST_CLI_PATH;
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.TEST_CLI_PATH;
  });

  describe('Strategy 1: Environment variable', () => {
    it('should return path from environment variable if exists', async () => {
      process.env.TEST_CLI_PATH = '/custom/path/testcli';
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/custom/path/testcli');
      expect(mockExistsSync).toHaveBeenCalledWith('/custom/path/testcli');
    });

    it('should skip environment variable if path does not exist', async () => {
      process.env.TEST_CLI_PATH = '/nonexistent/path/testcli';
      mockExistsSync.mockReturnValueOnce(false); // env path doesn't exist
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(new Error('not found'));
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(false); // common paths don't exist

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBeNull();
    });

    it('should skip environment variable if not set', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '/usr/bin/testcli\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/bin/testcli');
    });
  });

  describe('Strategy 2: which/where command', () => {
    it('should use "which" command on non-Windows platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      mockExec.mockImplementation((cmd, callback: any) => {
        expect(cmd).toBe('which testcli');
        callback(null, { stdout: '/usr/bin/testcli\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/bin/testcli');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should use "where" command on Windows platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      mockExec.mockImplementation((cmd, callback: any) => {
        expect(cmd).toBe('where testcli');
        callback(null, {
          stdout: 'C:\\Program Files\\testcli.exe\n',
          stderr: '',
        });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('C:\\Program Files\\testcli.exe');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle multiple paths from which/where command', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, {
          stdout: '/usr/bin/testcli\n/usr/local/bin/testcli\n',
          stderr: '',
        });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/bin/testcli'); // Should return first path
    });

    it('should skip which/where if command fails', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(new Error('command not found'));
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValueOnce(true); // First common path exists

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/local/bin/testcli');
    });

    it('should skip which/where if path does not exist', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '/nonexistent/testcli\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync
        .mockReturnValueOnce(false) // which path doesn't exist
        .mockReturnValueOnce(true); // First common path exists

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/local/bin/testcli');
    });

    it('should skip which/where if stdout is empty', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValueOnce(true); // First common path exists

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/local/bin/testcli');
    });
  });

  describe('Strategy 3: Common paths', () => {
    it('should check common paths in order', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(new Error('not found'));
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync
        .mockReturnValueOnce(false) // First path doesn't exist
        .mockReturnValueOnce(true); // Second path exists

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/opt/homebrew/bin/testcli');
      expect(mockExistsSync).toHaveBeenCalledWith('/usr/local/bin/testcli');
      expect(mockExistsSync).toHaveBeenCalledWith('/opt/homebrew/bin/testcli');
    });

    it('should return first existing common path', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(new Error('not found'));
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true); // All paths exist

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/local/bin/testcli');
    });

    it('should return null if no common paths exist', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(new Error('not found'));
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(false);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBeNull();
    });

    it('should handle empty common paths array', async () => {
      const config: CliDetectionConfig = {
        ...baseConfig,
        commonPaths: [],
      };

      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(new Error('not found'));
        return {} as ReturnType<typeof exec>;
      });

      const result = await detectCliGeneric(config);

      expect(result).toBeNull();
    });
  });

  describe('Full detection flow', () => {
    it('should prioritize environment variable over which command', async () => {
      process.env.TEST_CLI_PATH = '/custom/path/testcli';
      mockExistsSync.mockReturnValue(true);
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '/usr/bin/testcli\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/custom/path/testcli');
      expect(mockExec).not.toHaveBeenCalled(); // Should not reach which command
    });

    it('should prioritize which command over common paths', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '/usr/bin/testcli\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/bin/testcli');
      // Should not check common paths beyond which result
    });

    it('should try all strategies in order until one succeeds', async () => {
      process.env.TEST_CLI_PATH = '/nonexistent1/testcli';
      mockExistsSync
        .mockReturnValueOnce(false) // env path doesn't exist
        .mockReturnValueOnce(false) // which path doesn't exist
        .mockReturnValueOnce(false) // first common path doesn't exist
        .mockReturnValueOnce(true); // second common path exists

      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '/nonexistent2/testcli\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/opt/homebrew/bin/testcli');
    });
  });

  describe('Edge cases', () => {
    it('should handle config with special characters in command name', async () => {
      const config: CliDetectionConfig = {
        envVar: 'SPECIAL_CLI_PATH',
        commandName: 'test-cli-v2',
        commonPaths: [],
      };

      mockExec.mockImplementation((cmd, callback: any) => {
        expect(cmd).toContain('test-cli-v2');
        callback(null, { stdout: '/usr/bin/test-cli-v2\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(config);

      expect(result).toBe('/usr/bin/test-cli-v2');
    });

    it('should handle paths with spaces', async () => {
      process.env.TEST_CLI_PATH = '/path with spaces/testcli';
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/path with spaces/testcli');
    });

    it('should trim whitespace from which command output', async () => {
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '  /usr/bin/testcli  \n\n', stderr: '' });
        return {} as ReturnType<typeof exec>;
      });
      mockExistsSync.mockReturnValue(true);

      const result = await detectCliGeneric(baseConfig);

      expect(result).toBe('/usr/bin/testcli');
    });
  });
});
