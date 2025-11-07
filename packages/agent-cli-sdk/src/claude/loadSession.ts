import fs from 'fs/promises';
import type { UnifiedMessage } from '../types/unified';
import { parse } from './parse';

// ============================================================================
// Public API
// ============================================================================

/**
 * Options for loading a Claude session.
 */
interface LoadSessionOptions {
  /** Unique identifier for the Claude session */
  sessionId: string;
  /** Absolute path to the project directory */
  projectPath: string;
}

/**
 * Load and parse messages from a Claude CLI session file.
 *
 * Reads the session JSONL file from Claude's project directory, parses each line,
 * and returns a sorted array of unified messages. Returns an empty array if the
 * session file doesn't exist.
 *
 * @param options - Session loading options
 * @returns Promise resolving to an array of parsed messages sorted by timestamp
 *
 * @example
 * ```typescript
 * const messages = await loadSession({
 *   sessionId: 'abc123',
 *   projectPath: '/Users/username/project'
 * });
 * console.log(`Loaded ${messages.length} messages`);
 * ```
 */
export async function loadSession(options: LoadSessionOptions): Promise<UnifiedMessage[]> {
  const { sessionId, projectPath } = options;
  const filePath = `${getClaudeProjectDir(projectPath)}/${sessionId}.jsonl`;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const messages = lines
      .map((line) => parse(line))
      .filter((msg): msg is UnifiedMessage => msg !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    return messages;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// ============================================================================
// Private Helpers
// ============================================================================

function getClaudeProjectDir(projectPath: string): string {
  // Claude encodes project paths by replacing slashes with dashes
  // e.g., /Users/jnarowski/Dev/playground -> -Users-jnarowski-Dev-playground
  const encodedPath = projectPath.replace(/\//g, '-');
  return `${process.env.HOME}/.claude/projects/${encodedPath}`;
}
