import { z } from 'zod';

/**
 * Options for extracting usage data from events
 * Action: uses flat parameters
 */
export const extractUsageFromEventsOptionsSchema = z.object({
  events: z.unknown(), // Array of events (validated at runtime in function)
});

export type ExtractUsageFromEventsOptions = z.infer<typeof extractUsageFromEventsOptionsSchema>;
