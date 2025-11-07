import { z } from 'zod';

/**
 * Options for syncing project sessions from filesystem
 * Action: uses flat parameters
 */
export const syncProjectSessionsOptionsSchema = z.object({
  projectId: z.string().min(1, 'Project ID required'),
  userId: z.string().min(1, 'User ID required'),
});

export type SyncProjectSessionsOptions = z.infer<typeof syncProjectSessionsOptionsSchema>;
