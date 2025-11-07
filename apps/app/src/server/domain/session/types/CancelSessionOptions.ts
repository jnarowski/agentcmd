import { z } from 'zod';

/**
 * Options for canceling a running session
 * Action: uses flat parameters
 */
export const cancelSessionOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  userId: z.string().min(1, 'User ID required'),
  shouldBroadcast: z.boolean().optional().default(true),
});

export type CancelSessionOptions = z.infer<typeof cancelSessionOptionsSchema>;
