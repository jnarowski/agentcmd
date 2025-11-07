import { z } from 'zod';

/**
 * Options for unarchiving a session
 * Action: uses flat parameters
 */
export const unarchiveSessionOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  userId: z.string().min(1, 'User ID required'),
});

export type UnarchiveSessionOptions = z.infer<typeof unarchiveSessionOptionsSchema>;
