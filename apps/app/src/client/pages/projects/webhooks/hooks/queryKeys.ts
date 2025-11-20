/**
 * Query key factory for webhook-related queries
 * Follows TanStack Query best practices for key organization
 */

export const webhookQueryKeys = {
  // All webhook queries
  all: ["webhooks"] as const,

  // List queries
  lists: () => [...webhookQueryKeys.all, "list"] as const,
  list: (projectId: string) =>
    [...webhookQueryKeys.lists(), projectId] as const,

  // Detail queries
  details: () => [...webhookQueryKeys.all, "detail"] as const,
  detail: (webhookId: string) =>
    [...webhookQueryKeys.details(), webhookId] as const,

  // Event queries
  eventsRoot: () => [...webhookQueryKeys.all, "events"] as const,
  events: (webhookId: string) =>
    [...webhookQueryKeys.eventsRoot(), webhookId] as const,
  eventsFiltered: (
    webhookId: string,
    params: { status?: string; limit?: number; offset?: number },
  ) => [...webhookQueryKeys.events(webhookId), params] as const,

  // Test event query
  testEvent: (webhookId: string) =>
    [...webhookQueryKeys.all, "test-event", webhookId] as const,

  // Workflows query (for webhook form)
  workflows: (projectId: string) =>
    [...webhookQueryKeys.all, "workflows", projectId] as const,
};

// Alias for compatibility
export const webhookKeys = webhookQueryKeys;
