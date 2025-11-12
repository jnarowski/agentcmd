import { z } from 'zod';

/**
 * Options for getting sessions by project
 * Query operation: uses { filters } wrapper for WHERE clause filters
 */
export const getSessionsByProjectOptionsSchema = z.object({
  filters: z.object({
    projectId: z.string().min(1, 'Project ID required'),
    userId: z.string().min(1, 'User ID required'),
    includeArchived: z.boolean().optional().default(false),
    type: z.enum(['chat', 'planning', 'workflow']).optional(),
  }),
});

export type GetSessionsByProjectOptions = z.infer<typeof getSessionsByProjectOptionsSchema>;
