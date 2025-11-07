/**
 * Loads Gemini session files and transforms messages to unified format.
 *
 * Session Storage Location: ~/.gemini/tmp/{project-hash}/chats/
 * Project Hash: SHA-256 of absolute project path
 *
 * Unlike Claude/Codex (streaming JSONL), Gemini stores sessions as complete JSON objects.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { UnifiedMessage } from '../types/unified';
import type { GeminiSession } from './types';
import { parse } from './parse';

// ============================================================================
// Public API
// ============================================================================

export interface LoadGeminiSessionOptions {
  /** Project path (defaults to current working directory) */
  projectPath?: string;
  /** Optional session ID to load specific session */
  sessionId?: string;
}

/**
 * Load Gemini session from disk and transform to unified format.
 *
 * @param options - Load options (projectPath, sessionId)
 * @returns Array of UnifiedMessage in Claude-compatible format, or empty array if session not found
 * @throws Error if session file is corrupt or invalid JSON
 */
export function loadSession(options: LoadGeminiSessionOptions = {}): UnifiedMessage[] {
  const projectPath = options.projectPath || process.cwd();
  const projectHash = calculateProjectHash(projectPath);
  const sessionDir = getGeminiSessionDir(projectHash);

  // Find session file
  const sessionFile = options.sessionId
    ? findSessionById(sessionDir, options.sessionId)
    : findMostRecentSession(sessionDir);

  if (!sessionFile) {
    return []; // Consistent with Claude/Codex: return empty array when no session found
  }

  // Read and parse session JSON
  let content: string;
  try {
    content = fs.readFileSync(sessionFile, 'utf-8');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  // Parsing logic stays outside try-catch - if data is corrupt, let it throw
  const sessionData = JSON.parse(content) as GeminiSession;

  // Transform each Gemini message to Claude format
  return sessionData.messages.map((msg) => parse(msg));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate SHA-256 hash of absolute project path.
 */
function calculateProjectHash(projectPath: string): string {
  const absolutePath = path.resolve(projectPath);
  return crypto.createHash('sha256').update(absolutePath).digest('hex');
}

/**
 * Get Gemini session directory path for a project hash.
 */
function getGeminiSessionDir(projectHash: string): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.gemini', 'tmp', projectHash, 'chats');
}

/**
 * Find session file by ID.
 */
function findSessionById(sessionDir: string, sessionId: string): string | null {
  if (!fs.existsSync(sessionDir)) {
    return null;
  }

  const files = fs.readdirSync(sessionDir);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(sessionDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const session = JSON.parse(content) as GeminiSession;
        if (session.sessionId === sessionId) {
          return filePath;
        }
      } catch {
        // Skip invalid files
        continue;
      }
    }
  }

  return null;
}

/**
 * Find most recent session file by lastUpdated timestamp.
 */
function findMostRecentSession(sessionDir: string): string | null {
  if (!fs.existsSync(sessionDir)) {
    return null;
  }

  const files = fs.readdirSync(sessionDir);
  let mostRecentFile: string | null = null;
  let mostRecentTime = 0;

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(sessionDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const session = JSON.parse(content) as GeminiSession;
        const lastUpdated = new Date(session.lastUpdated).getTime();

        if (lastUpdated > mostRecentTime) {
          mostRecentTime = lastUpdated;
          mostRecentFile = filePath;
        }
      } catch {
        // Skip invalid files
        continue;
      }
    }
  }

  return mostRecentFile;
}
