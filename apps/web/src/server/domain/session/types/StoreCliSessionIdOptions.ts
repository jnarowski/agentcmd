import { z } from 'zod';

/**
 * Options for storing CLI-generated session ID
 * Action: uses flat parameters
 */
export const storeCliSessionIdOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  cliSessionId: z.string().optional(),
});

export type StoreCliSessionIdOptions = z.infer<typeof storeCliSessionIdOptionsSchema>;
