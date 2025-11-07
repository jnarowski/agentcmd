import { detectCliGeneric } from '../utils/cliDetection';

/**
 * Detects the Codex CLI by checking multiple sources.
 *
 * @returns The path to the Codex CLI executable, or null if not found
 *
 * @example
 * ```ts
 * import { detectCli } from '@repo/agent-cli-sdk';
 *
 * const cliPath = await detectCli();
 * if (cliPath) {
 *   console.log('Codex CLI found at:', cliPath);
 * } else {
 *   console.error('Codex CLI not found');
 * }
 * ```
 */
export async function detectCli(): Promise<string | null> {
  return detectCliGeneric({
    envVar: 'CODEX_CLI_PATH',
    commandName: 'codex',
    commonPaths: [
      '/opt/homebrew/bin/codex', // Homebrew on Apple Silicon
      '/usr/local/bin/codex', // Homebrew on Intel, or standard install
      '/usr/bin/codex',
      `${process.env.HOME}/.local/bin/codex`, // User local install
      `${process.env.HOME}/bin/codex`,
    ],
  });
}
