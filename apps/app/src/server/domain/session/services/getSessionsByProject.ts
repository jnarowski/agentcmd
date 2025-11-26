import { prisma } from '@/shared/prisma';
import type { SessionResponse } from '@/shared/types/agent-session.types';
import type { GetSessionsByProjectOptions } from '../types/GetSessionsByProjectOptions';
import { toSessionResponse } from '../utils';

/**
 * Get all sessions for a project
 */
export async function getSessionsByProject({
  filters: { projectId, userId, includeArchived = false, type, permission_mode }
}: GetSessionsByProjectOptions): Promise<SessionResponse[]> {
  const sessions = await prisma.agentSession.findMany({
    where: {
      project_id: projectId,
      user_id: userId,
      ...(includeArchived ? {} : { is_archived: false }),
      ...(type && { type }),
      ...(permission_mode && { permission_mode }),
    },
    // Don't order by updated_at as sync operations set all sessions to same timestamp
    // We'll sort by metadata.lastMessageAt in application code instead
  });

  // Map to response format
  const mappedSessions = sessions.map(toSessionResponse);

  // Sort by created_at (most recent first)
  // created_at is stable and doesn't change during sync operations
  return mappedSessions.sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();

    // Handle invalid dates (NaN) by treating them as oldest
    if (isNaN(aTime) && isNaN(bTime)) return 0;
    if (isNaN(aTime)) return 1; // a is older, b comes first
    if (isNaN(bTime)) return -1; // b is older, a comes first

    return bTime - aTime; // Descending order (most recent first)
  });
}
