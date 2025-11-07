import { z } from 'zod';

/**
 * Options for validating session ownership
 * Action: uses flat parameters
 */
export const validateSessionOwnershipOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  userId: z.string().min(1, 'User ID required'),
});

export type ValidateSessionOwnershipOptions = z.infer<typeof validateSessionOwnershipOptionsSchema>;
