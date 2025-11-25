import { prisma } from '@/shared/prisma';
import { loadMessages } from 'agent-cli-sdk';
import type { UnifiedMessage } from 'agent-cli-sdk';
import type { GetSessionMessagesOptions } from '../types/GetSessionMessagesOptions';

/**
 * Get messages for a specific session
 * Uses session_path directly when available, falls back to projectPath for legacy sessions
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

  if (session.user_id !== userId) {
    throw new Error('Unauthorized access to session');
  }

  // Check if agent is supported by SDK
  if (session.agent === 'cursor') {
    throw new Error('Cursor sessions are not yet supported by the SDK');
  }

  const cliSessionId = session.cli_session_id || sessionId;

  // Use SDK with sessionPath (handles worktrees correctly)
  const messages = await loadMessages({
    tool: session.agent,
    sessionId: cliSessionId,
    sessionPath: session.session_path ?? undefined
  });

  return messages;
}
