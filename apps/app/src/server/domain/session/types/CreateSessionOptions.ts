import { z } from 'zod';

/**
 * Options for creating a new session
 * CRUD operation: uses { data } wrapper pattern
 */
export const createSessionOptionsSchema = z.object({
  data: z.object({
    projectId: z.string().min(1, 'Project ID required'),
    userId: z.string().min(1, 'User ID required'),
    sessionId: z.string().min(1, 'Session ID required'),
    agent: z.enum(['claude', 'codex', 'cursor', 'gemini']).optional(),
    type: z.enum(['chat', 'workflow', 'internal']).optional(),
    permission_mode: z.enum(['default', 'plan', 'acceptEdits', 'bypassPermissions']).optional(),
    name: z.string().optional(),
    metadataOverride: z.record(z.string(), z.unknown()).optional(),
    cli_session_id: z.string().optional(),
    session_path: z.string().optional(),
  }),
});

export type CreateSessionOptions = z.infer<typeof createSessionOptionsSchema>;
