import { z } from 'zod';

/**
 * Options for updating session state
 * Specialized update: uses { id, data } pattern
 */
export const updateSessionStateOptionsSchema = z.object({
  id: z.string().min(1, 'Session ID required'),
  data: z.object({
    state: z.enum(['idle', 'working', 'error']),
    errorMessage: z.string().nullable().optional(),
  }),
  shouldBroadcast: z.boolean().optional().default(true),
});

export type UpdateSessionStateOptions = z.infer<typeof updateSessionStateOptionsSchema>;
