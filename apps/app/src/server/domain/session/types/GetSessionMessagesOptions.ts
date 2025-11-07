import { z } from 'zod';

/**
 * Options for getting session messages
 * Action: uses flat parameters
 */
export const getSessionMessagesOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  userId: z.string().min(1, 'User ID required'),
});

export type GetSessionMessagesOptions = z.infer<typeof getSessionMessagesOptionsSchema>;
