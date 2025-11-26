import { z } from 'zod';

/**
 * Options for updating a session's name
 * Specialized update: uses { id, data } pattern with userId for auth
 */
export const updateSessionNameOptionsSchema = z.object({
  id: z.string().min(1, 'Session ID required'),
  data: z.object({
    name: z.string().min(1, 'Name required'),
  }),
  userId: z.string().min(1, 'User ID required'),
});

export type UpdateSessionNameOptions = z.infer<typeof updateSessionNameOptionsSchema>;
