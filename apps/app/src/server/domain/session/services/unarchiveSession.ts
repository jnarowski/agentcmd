import { prisma } from '@/shared/prisma';
import type { AgentSession } from '@prisma/client';
import type { UnarchiveSessionOptions } from '../types/UnarchiveSessionOptions';

/**
 * Unarchive a session by setting is_archived to false and archived_at to null
 */
export async function unarchiveSession({
	sessionId,
	userId
}: UnarchiveSessionOptions): Promise<AgentSession | null> {
	// Verify session exists and belongs to user
	const session = await prisma.agentSession.findFirst({
		where: {
			id: sessionId,
			user_id: userId,
		},
	});

	if (!session) {
		return null;
	}

	// Update session to unarchived
	const unarchivedSession = await prisma.agentSession.update({
		where: { id: sessionId },
		data: {
			is_archived: false,
			archived_at: null,
		},
	});

	return unarchivedSession;
}
