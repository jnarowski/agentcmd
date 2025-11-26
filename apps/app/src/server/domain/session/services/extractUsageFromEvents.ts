import type { ExtractUsageFromEventsOptions } from '../types/ExtractUsageFromEventsOptions';

export interface UsageData {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

/**
 * Extract usage data from agent CLI SDK result events
 * Pure function - no database access
 */
export function extractUsageFromEvents({
  events
}: ExtractUsageFromEventsOptions): UsageData | null {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  // Find the last assistant message with usage data
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i] as Record<string, unknown>;

    // Check event.usage (direct usage field)
    if (
      (event.type === "assistant" || event.role === "assistant") &&
      event.usage
    ) {
      const eventUsage = event.usage as Record<string, unknown>;
      return {
        input_tokens: (eventUsage.input_tokens as number) || 0,
        output_tokens: (eventUsage.output_tokens as number) || 0,
        cache_creation_input_tokens:
          (eventUsage.cache_creation_input_tokens as number) || 0,
        cache_read_input_tokens:
          (eventUsage.cache_read_input_tokens as number) || 0,
      };
    }

    // Also check event.message.usage (Claude CLI format)
    if (
      (event.type === "assistant" || event.role === "assistant") &&
      event.message
    ) {
      const message = event.message as Record<string, unknown>;
      if (message.usage) {
        const messageUsage = message.usage as Record<string, unknown>;
        return {
          input_tokens: (messageUsage.input_tokens as number) || 0,
          output_tokens: (messageUsage.output_tokens as number) || 0,
          cache_creation_input_tokens:
            (messageUsage.cache_creation_input_tokens as number) || 0,
          cache_read_input_tokens:
            (messageUsage.cache_read_input_tokens as number) || 0,
        };
      }
    }
  }

  return null;
}
