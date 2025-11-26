import { z } from 'zod';
import type { AgentSession } from '@prisma/client';

/**
 * Options for updating a session
 * CRUD operation: uses { id, data } pattern
 * Generic update - accepts any Partial<AgentSession>
 */
export const updateSessionOptionsSchema = z.object({
  id: z.string().min(1),
  data: z.record(z.string(), z.unknown()), // Partial<AgentSession> - flexible for any updates
  shouldBroadcast: z.boolean().optional().default(true),
});

export type UpdateSessionOptions = {
  id: string;
  data: Partial<AgentSession>;
  shouldBroadcast?: boolean;
};
