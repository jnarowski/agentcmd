import { detectCliGeneric } from '../utils/cliDetection';

/**
 * Detects the Claude CLI by checking multiple sources
 *
 * @returns The path to the Claude CLI executable, or null if not found
 *
 * @example
 * ```ts
 * import { detectCli } from '@repo/agent-cli-sdk';
 *
 * const cliPath = await detectCli();
 * if (cliPath) {
 *   console.log('Claude CLI found at:', cliPath);
 * } else {
 *   console.error('Claude CLI not found');
 * }
 * ```
 */
export async function detectCli(): Promise<string | null> {
  return detectCliGeneric({
    envVar: 'CLAUDE_CLI_PATH',
    commandName: 'claude',
    commonPaths: [
      '/usr/local/bin/claude',
      '/usr/bin/claude',
      '/opt/homebrew/bin/claude',
      `${process.env.HOME}/.local/bin/claude`,
      `${process.env.HOME}/bin/claude`,
      `${process.env.HOME}/.claude/local/claude`, // Claude Code local installation
    ],
  });
}
