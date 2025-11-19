import { prisma } from '@/shared/prisma';
import type { AgentSession } from '@prisma/client';
import type { ArchiveSessionOptions } from '../types/ArchiveSessionOptions';

/**
 * Archive a session by setting is_archived to true and archived_at to current timestamp
 */
export async function archiveSession({
	sessionId,
	userId
}: ArchiveSessionOptions): Promise<AgentSession | null> {
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

	// Update session to archived
	const archivedSession = await prisma.agentSession.update({
		where: { id: sessionId },
		data: {
			is_archived: true,
			archived_at: new Date(),
		},
	});

	return archivedSession;
}
