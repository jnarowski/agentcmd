import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const execAsync = promisify(exec);

/**
 * Configuration for CLI detection
 */
export interface CliDetectionConfig {
  /** Environment variable name (e.g., 'CLAUDE_CLI_PATH') */
  envVar: string;
  /** CLI command name for which/where (e.g., 'claude') */
  commandName: string;
  /** Array of common installation paths to check */
  commonPaths: string[];
}

/**
 * Generic CLI detection utility
 *
 * Tries multiple strategies to locate a CLI tool:
 * 1. Environment variable
 * 2. which/where command
 * 3. Common installation paths
 *
 * @param config - Detection configuration
 * @returns Path to CLI or null if not found
 *
 * @example
 * const claudePath = await detectCliGeneric({
 *   envVar: 'CLAUDE_CLI_PATH',
 *   commandName: 'claude',
 *   commonPaths: ['/usr/local/bin/claude', '/opt/homebrew/bin/claude']
 * });
 */
export async function detectCliGeneric(config: CliDetectionConfig): Promise<string | null> {
  // Strategy 1: Check environment variable
  const envPath = process.env[config.envVar];
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // Strategy 2: Try which/where command
  try {
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execAsync(`${whichCommand} ${config.commandName}`);
    const path = stdout.trim().split('\n')[0];
    if (path && existsSync(path)) {
      return path;
    }
  } catch {
    // Command failed, continue to next strategy
  }

  // Strategy 3: Check common installation paths
  for (const path of config.commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}
