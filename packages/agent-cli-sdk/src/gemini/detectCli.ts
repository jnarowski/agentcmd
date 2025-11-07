/**
 * Detects Gemini CLI installation.
 *
 * Environment Variable: GEMINI_CLI_PATH
 *
 * Common Paths:
 * - /usr/local/bin/gemini
 * - ~/.npm-global/bin/gemini
 *
 * Note: Skips glob pattern ~/.local/share/mise/installs/node/star/bin/gemini
 * as detectCliGeneric doesn't support glob expansion
 */

import { detectCliGeneric } from '../utils/cliDetection';
import os from 'node:os';
import path from 'node:path';

// ============================================================================
// Public API
// ============================================================================

/**
 * Detect Gemini CLI installation path.
 *
 * Checks in order:
 * 1. GEMINI_CLI_PATH environment variable
 * 2. PATH (using which/where command)
 * 3. Common installation paths
 *
 * @returns Path to Gemini CLI executable, or null if not found
 */
export async function detectCli(): Promise<string | null> {
  return detectCliGeneric({
    envVar: 'GEMINI_CLI_PATH',
    commandName: 'gemini',
    commonPaths: [
      '/usr/local/bin/gemini',
      // Note: Skipping glob pattern ~/.local/share/mise/installs/node/*/bin/gemini
      // as detectCliGeneric doesn't support glob expansion
      path.join(os.homedir(), '.npm-global', 'bin', 'gemini'),
    ],
  });
}
