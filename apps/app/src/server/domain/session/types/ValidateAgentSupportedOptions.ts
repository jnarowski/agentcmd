import { z } from 'zod';

/**
 * Options for validating agent support
 * Action: uses flat parameters
 */
export const validateAgentSupportedOptionsSchema = z.object({
  agent: z.string().min(1, 'Agent type required'),
});

export type ValidateAgentSupportedOptions = z.infer<typeof validateAgentSupportedOptionsSchema>;
