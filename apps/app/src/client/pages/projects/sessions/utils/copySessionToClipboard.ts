import type { SessionData } from '../stores/sessionStore';

/**
 * Session state subset needed for clipboard copy
 */
interface SessionState {
  session: SessionData | null;
  sessionId: string | null;
}

/**
 * Generate formatted JSON for session state and copy to clipboard.
 *
 * Includes:
 * - All messages with full UIMessage fields (id, role, content, parentId, sessionId, _original)
 * - Session metadata (id, agent, state, project association)
 * - Enrichment stats (message counts before/after filtering)
 *
 * @param sessionState - Current session state from sessionStore
 * @returns Promise that resolves when copy is complete
 */
export async function copySessionToClipboard(
  sessionState: SessionState
): Promise<void> {
  if (!sessionState.session) {
    throw new Error('No active session to copy');
  }

  const { session, sessionId } = sessionState;

  // Build session JSON with all debugging context
  const sessionData = {
    sessionId,
    agent: session.agent,
    isStreaming: session.isStreaming,
    loadingState: session.loadingState,
    error: session.error,
    metadata: session.metadata,
    enrichmentStats: {
      totalMessages: session.messages.length,
      messageRoles: session.messages.reduce((acc: Record<string, number>, msg) => {
        acc[msg.role] = (acc[msg.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      messagesWithParentId: session.messages.filter((m) => m.parentId).length,
      messagesWithSessionId: session.messages.filter((m) => m.sessionId).length,
      streamingMessages: session.messages.filter((m) => m.isStreaming).length,
    },
    messages: session.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      tool: msg.tool,
      isStreaming: msg.isStreaming,
      isError: msg.isError,
      parentId: msg.parentId,
      sessionId: msg.sessionId,
      _original: msg._original, // Full SDK message for debugging
      contentSummary: {
        blockCount: Array.isArray(msg.content) ? msg.content.length : 1,
        blockTypes: Array.isArray(msg.content)
          ? msg.content.map((b) => typeof b === 'string' ? 'string' : b.type)
          : ['string'],
        isEmpty: Array.isArray(msg.content) ? msg.content.length === 0 : false,
      },
    })),
  };

  // Pretty-print with 2-space indent
  const json = JSON.stringify(sessionData, null, 2);

  // Copy to clipboard
  await navigator.clipboard.writeText(json);
}
