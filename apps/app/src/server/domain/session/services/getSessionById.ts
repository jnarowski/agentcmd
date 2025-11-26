import { prisma } from '@/shared/prisma';
import type { SessionResponse } from '@/shared/types/agent-session.types';
import { toSessionResponse } from '../utils';

/**
 * Get single session by ID with ownership check
 */
export async function getSessionById({
  sessionId,
  projectId,
  userId,
}: {
  sessionId: string;
  projectId: string;
  userId: string;
}): Promise<SessionResponse | null> {
  const session = await prisma.agentSession.findFirst({
    where: {
      id: sessionId,
      project_id: projectId,
      user_id: userId,
    },
  });

  if (!session) return null;

  return toSessionResponse(session);
}
