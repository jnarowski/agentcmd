import { z } from 'zod';

/**
 * Options for generating a session name
 * Action: uses flat parameters
 */
export const generateSessionNameOptionsSchema = z.object({
  userPrompt: z.string().min(1, 'User prompt required'),
});

export type GenerateSessionNameOptions = z.infer<typeof generateSessionNameOptionsSchema>;
