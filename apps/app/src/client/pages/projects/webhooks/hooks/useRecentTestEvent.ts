import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { webhookKeys } from "./queryKeys";
import type { WebhookEvent } from "../types/webhook.types";

/**
 * Fetch most recent test event for webhook
 */
export function useRecentTestEvent(webhookId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: webhookKeys.testEvent(webhookId!),
    queryFn: async (): Promise<WebhookEvent | null> => {
      const params = new URLSearchParams({
        status: "test",
        limit: "1",
      });

      const response = await api.get<{ data: WebhookEvent[] }>(`/api/webhooks/${webhookId}/events?${params}`);
      const events = response.data;
      return events.length > 0 ? events[0] : null;
    },
    enabled: options?.enabled !== false && !!webhookId,
  });
}
