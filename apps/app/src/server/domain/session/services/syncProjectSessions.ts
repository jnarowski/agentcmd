import { prisma } from '@/shared/prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import type { SyncSessionsResponse } from '@/shared/types/agent-session.types';
import { encodeProjectPath, getClaudeProjectsDir } from '@/server/utils/path';
import { parseJSONLFile } from './parseJSONLFile';
import type { SyncProjectSessionsOptions } from '../types/SyncProjectSessionsOptions';

/**
 * Check if a file is a valid session file
 * Valid files must end with .jsonl and NOT start with "agent-"
 * @param filename - The filename to check
 * @returns True if valid session file, false otherwise
 */
function isValidSessionFile(filename: string): boolean {
  return filename.endsWith('.jsonl') && !filename.startsWith('agent-');
}

/**
 * Sync project sessions from filesystem to database
 * Scans ~/.claude/projects/{encodedPath}/ for JSONL files
 */
export async function syncProjectSessions({
  projectId,
  userId
}: SyncProjectSessionsOptions): Promise<SyncSessionsResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const encodedPath = encodeProjectPath(project.path);
  const projectSessionsDir = path.join(
    getClaudeProjectsDir(),
    encodedPath
  );

  let synced = 0;
  let created = 0;
  let updated = 0;

  try {
    // Check if directory exists
    await fs.access(projectSessionsDir);

    // Read all JSONL files in directory
    const files = await fs.readdir(projectSessionsDir);
    const jsonlFiles = files.filter(isValidSessionFile);

    // Fetch all existing Claude sessions for this project
    // Only sync Claude sessions - other agents (Codex, Cursor, Gemini) have different storage locations
    const dbClaudeSessions = await prisma.agentSession.findMany({
      where: {
        projectId,
        agent: 'claude',
      },
    });

    // Also fetch IDs of all sessions (any agent) to avoid unique constraint violations
    const allSessionIds = await prisma.agentSession.findMany({
      where: { projectId },
      select: { id: true },
    });

    const existingClaudeSessionsMap = new Map(
      dbClaudeSessions.map((session) => [session.id, session])
    );

    const allExistingSessionIds = new Set(
      allSessionIds.map((session) => session.id)
    );

    const jsonlSessionIds = new Set<string>();
    const sessionsToCreate: Array<{
      id: string;
      projectId: string;
      userId: string;
      agent: 'claude';
      cli_session_id: string;
      session_path: string;
      metadata: Prisma.JsonValue;
      state: 'idle';
      error_message: null;
      created_at: Date;
      permission_mode: string;
    }> = [];
    const sessionsToUpdate: Array<{
      id: string;
      created_at: Date;
    }> = [];

    // Parse all JSONL files and prepare batch operations
    for (const file of jsonlFiles) {
      const sessionId = path.basename(file, '.jsonl');
      const filePath = path.join(projectSessionsDir, file);
      jsonlSessionIds.add(sessionId);

      try {
        // Parse JSONL file to extract metadata
        const metadata = await parseJSONLFile({ filePath });

        if (existingClaudeSessionsMap.has(sessionId)) {
          // Session already exists - check if we need to update created_at with actual creation date
          const existingSession = existingClaudeSessionsMap.get(sessionId)!;

          // If metadata has createdAt and it's different from DB created_at, update it
          if (metadata.createdAt) {
            const metadataCreatedAt = new Date(metadata.createdAt);
            const dbCreatedAt = new Date(existingSession.created_at);

            // Update if timestamps differ by more than 1 second (to account for rounding)
            if (Math.abs(metadataCreatedAt.getTime() - dbCreatedAt.getTime()) > 1000) {
              sessionsToUpdate.push({
                id: sessionId,
                created_at: metadataCreatedAt,
              });
            }
          }
        } else if (allExistingSessionIds.has(sessionId)) {
          // Session exists but as a different agent type - skip to avoid conflict
          // (This can happen if the same session ID is used across different agents)
        } else {
          // Create new Claude session
          sessionsToCreate.push({
            id: sessionId,
            projectId,
            userId,
            agent: 'claude',
            cli_session_id: sessionId,
            session_path: filePath,
            metadata: JSON.parse(JSON.stringify(metadata)),
            state: 'idle',
            error_message: null,
            created_at: metadata.createdAt ? new Date(metadata.createdAt) : new Date(),
            permission_mode: metadata.isPlanSession ? 'plan' : 'default',
          });
        }

        synced++;
      } catch {
        // Skip sessions that fail to sync
      }
    }

    // Batch create new sessions
    if (sessionsToCreate.length > 0) {
      const beforeCount = await prisma.agentSession.count({
        where: { projectId },
      });

      try {
        await prisma.agentSession.createMany({
          // @ts-ignore - Prisma type compatibility
          data: sessionsToCreate,
        });
      } catch {
        // Handle race condition: another sync may have created some sessions
        // Create sessions one by one, skipping duplicates
        for (const session of sessionsToCreate) {
          try {
            await prisma.agentSession.create({
              // @ts-ignore - Prisma type compatibility
              data: session,
            });
          } catch {
            // Skip if session already exists (race condition)
          }
        }
      }

      const afterCount = await prisma.agentSession.count({
        where: { projectId },
      });

      created = afterCount - beforeCount;
    }

    // Batch update existing sessions with correct creation dates
    if (sessionsToUpdate.length > 0) {
      await Promise.all(
        sessionsToUpdate.map((session) =>
          prisma.agentSession.update({
            where: { id: session.id },
            data: { created_at: session.created_at },
          })
        )
      );
      updated = sessionsToUpdate.length;
    }

    // Batch delete orphaned Claude sessions (only)
    // Other agent types are not checked since they have different storage locations
    // IMPORTANT: Only delete sessions that are:
    // 1. Not in the JSONL files (orphaned)
    // 2. In "idle" state (not actively being created/used)
    // 3. Older than 5 seconds (to avoid race conditions with new session creation)
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const orphanedSessionIds = dbClaudeSessions
      .filter((session) => {
        // Keep if session has a JSONL file
        if (jsonlSessionIds.has(session.id)) {
          return false;
        }

        // Keep if session is actively being worked on
        if (session.state === 'working') {
          return false;
        }

        // Keep if session was created very recently (race condition protection)
        if (session.created_at > fiveSecondsAgo) {
          return false;
        }

        // This session is truly orphaned and safe to delete
        return true;
      })
      .map((session) => session.id);

    if (orphanedSessionIds.length > 0) {
      await prisma.agentSession.deleteMany({
        where: {
          id: { in: orphanedSessionIds },
        },
      });
    }
  } catch (error: unknown) {
    // Directory doesn't exist or can't be accessed
    const err = error instanceof Error ? error : new Error(String(error));
    if ('code' in err && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // If directory doesn't exist, no sessions to sync
  }

  return { synced, created, updated };
}
