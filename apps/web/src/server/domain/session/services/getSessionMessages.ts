import { prisma } from '@/shared/prisma';
import { loadMessages } from '@repo/agent-cli-sdk';
import type { UnifiedMessage } from '@repo/agent-cli-sdk';
import type { GetSessionMessagesOptions } from '../types/GetSessionMessagesOptions';

/**
 * Get messages for a specific session
 * Uses SDK to load and parse messages
 */
export async function getSessionMessages({
  sessionId,
  userId
}: GetSessionMessagesOptions): Promise<UnifiedMessage[]> {
  // Verify session exists and user has access
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    include: { project: true },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.userId !== userId) {
    throw new Error('Unauthorized access to session');
  }

  // Use cli_session_id if available (CLI-generated ID), otherwise fall back to database ID
  // This allows loading sessions for both Claude and Codex using their native session IDs
  const cliSessionId = session.cli_session_id || sessionId;

  // Use SDK to load session messages
  const messages = await loadMessages({
    tool: session.agent,
    sessionId: cliSessionId,
    projectPath: session.project.path
  });

  return messages;
}
