import { z } from 'zod';
import type { AgentSessionMetadata } from '@/shared/types/agent-session.types';

/**
 * Options for updating session metadata
 * Specialized update: uses { id, data } pattern
 */
export const updateSessionMetadataOptionsSchema = z.object({
  id: z.string().min(1),
  data: z.object({
    metadata: z.record(z.string(), z.unknown()), // Partial<AgentSessionMetadata>
  }),
});

export type UpdateSessionMetadataOptions = {
  id: string;
  data: {
    metadata: Partial<AgentSessionMetadata>;
  };
};
