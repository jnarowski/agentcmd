import fs from 'fs/promises';
import { glob } from 'glob';
import type { UnifiedMessage } from '../types/unified';
import { parse } from './parse';

// ============================================================================
// Public API
// ============================================================================

/**
 * Options for loading a Codex session.
 */
interface LoadSessionOptions {
  /** Unique identifier for the Codex session (UUID from session_meta) */
  sessionId: string;
  /** Project path (unused by Codex - sessions are globally indexed) */
  projectPath?: string;
}

/**
 * Load and parse messages from a Codex CLI session file.
 *
 * Codex stores sessions in `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`.
 * This function searches for the session file by UUID and parses all messages.
 *
 * @param options - Session loading options
 * @returns Promise resolving to an array of parsed messages sorted by timestamp
 *
 * @example
 * ```typescript
 * const messages = await loadSession({
 *   sessionId: '01997e76-d124-7592-9cac-2ec05abbca08'
 * });
 * console.log(`Loaded ${messages.length} messages`);
 * ```
 */
export async function loadSession(options: LoadSessionOptions): Promise<UnifiedMessage[]> {
  const { sessionId, projectPath } = options;

  console.log('[CodexLoadSession] Starting session load', {
    sessionId,
    projectPath: projectPath || '(not provided)',
  });

  // Find the session file
  const sessionPath = await findSessionFile(sessionId);

  if (!sessionPath) {
    console.log('[CodexLoadSession] No session file found', { sessionId });
    // Return empty array if session not found (match Claude behavior)
    return [];
  }

  console.log('[CodexLoadSession] Found session file', { sessionPath });

  try {
    const content = await fs.readFile(sessionPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    console.log('[CodexLoadSession] Read session file', {
      fileSize: content.length,
      totalLines: lines.length,
    });

    const parsedMessages = lines.map((line) => parse(line));
    const validMessages = parsedMessages.filter((msg): msg is UnifiedMessage => msg !== null);
    const messages = validMessages.sort((a, b) => a.timestamp - b.timestamp);

    console.log('[CodexLoadSession] Parsed messages', {
      totalLines: lines.length,
      parsedMessages: parsedMessages.length,
      validMessages: validMessages.length,
      nullMessages: parsedMessages.length - validMessages.length,
      finalMessages: messages.length,
    });

    console.log('[CodexLoadSession] Returning messages', {
      count: messages.length,
    });

    return messages;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      console.log('[CodexLoadSession] File not found (ENOENT)', {
        sessionPath,
      });
      return [];
    }
    console.error('[CodexLoadSession] Error reading session file', {
      error: err.message,
      code: err.code,
      sessionPath,
    });
    throw error;
  }
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Find a Codex session file by searching for the UUID in the filename.
 *
 * Codex session files are named: rollout-{timestamp}-{uuid}.jsonl
 * They are stored in date-based directories: ~/.codex/sessions/YYYY/MM/DD/
 */
async function findSessionFile(sessionId: string): Promise<string | null> {
  const codexHome = process.env.CODEX_HOME || `${process.env.HOME}/.codex`;
  const sessionsDir = `${codexHome}/sessions`;

  console.log('[CodexLoadSession] Searching for session file', {
    sessionId,
    codexHome,
    sessionsDir,
  });

  try {
    // Search for file containing the session ID
    // Pattern: sessions/**/*-{sessionId}.jsonl
    const pattern = `${sessionsDir}/**/*-${sessionId}.jsonl`;

    console.log('[CodexLoadSession] Using glob pattern', { pattern });

    const files = await glob(pattern);

    console.log('[CodexLoadSession] Glob search complete', {
      filesFound: files.length,
      firstMatch: files[0] || '(none)',
      allMatches: files,
    });

    // Return the first match (should be unique by UUID)
    return files[0] || null;
  } catch (error) {
    console.error('[CodexLoadSession] Error during glob search', {
      error: error instanceof Error ? error.message : String(error),
      sessionId,
    });
    return null;
  }
}
