import { z } from 'zod';

/**
 * Options for archiving a session
 * Action: uses flat parameters
 */
export const archiveSessionOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  userId: z.string().min(1, 'User ID required'),
});

export type ArchiveSessionOptions = z.infer<typeof archiveSessionOptionsSchema>;
