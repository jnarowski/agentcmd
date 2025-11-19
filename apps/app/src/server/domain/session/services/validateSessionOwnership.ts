import { prisma } from "@/shared/prisma";
import type { AgentSession, Project } from "@prisma/client";
import type { ValidateSessionOwnershipOptions } from '../types/ValidateSessionOwnershipOptions';

export interface SessionWithProject extends AgentSession {
  project: Project;
}

/**
 * Validate session ownership and return session with project data
 * Throws error if session not found or user doesn't own it
 */
export async function validateSessionOwnership({
  sessionId,
  userId
}: ValidateSessionOwnershipOptions): Promise<SessionWithProject> {
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    include: { project: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.user_id !== userId) {
    throw new Error("Unauthorized access to session");
  }

  return session;
}
