import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { WebhookEvent, WebhookEventStatus } from "../types/webhook.types";
import { webhookKeys } from "./queryKeys";

export interface UseWebhookEventsOptions {
  webhookId: string;
  status?: WebhookEventStatus;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export interface WebhookEventsResponse {
  events: WebhookEvent[];
  total: number;
  limit: number;
  offset: number;
}

export function useWebhookEvents({
  webhookId,
  status,
  limit = 50,
  offset = 0,
  enabled = true,
}: UseWebhookEventsOptions) {
  return useQuery<WebhookEventsResponse>({
    queryKey: webhookKeys.eventsFiltered(webhookId, { status, limit, offset }),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        params.append("status", status);
      }

      return api.get<WebhookEventsResponse>(
        `/api/webhooks/${webhookId}/events?${params.toString()}`
      );
    },
    enabled,
  });
}
