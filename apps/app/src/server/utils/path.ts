/**
 * Path Utilities
 *
 * Shared utilities for working with Claude project directories and session files.
 * Used by services and agents to maintain consistent path handling.
 */

import path from 'node:path';
import os from 'node:os';

/**
 * Encode a project path by replacing slashes with dashes
 *
 * @param projectPath - The project path to encode (e.g., "/Users/john/project")
 * @returns Encoded path (e.g., "-Users-john-project")
 *
 * @example
 * encodeProjectPath('/Users/john/my-app') // => '-Users-john-my-app'
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Get the Claude projects directory path
 *
 * @returns Absolute path to ~/.claude/projects
 */
export function getClaudeProjectsDir(): string {
  return path.join(os.homedir(), '.claude', 'projects');
}

/**
 * Get the full path to a session file
 *
 * @param projectPath - The project path
 * @param sessionId - The session ID
 * @returns Full path to the session JSONL file
 *
 * @example
 * getSessionFilePath('/Users/john/app', 'session-123')
 * // => '/Users/john/.claude/projects/-Users-john-app/session-123.jsonl'
 */
export function getSessionFilePath(
  projectPath: string,
  sessionId: string,
): string {
  const encodedPath = encodeProjectPath(projectPath);
  const projectDir = path.join(getClaudeProjectsDir(), encodedPath);
  return path.join(projectDir, `${sessionId}.jsonl`);
}
