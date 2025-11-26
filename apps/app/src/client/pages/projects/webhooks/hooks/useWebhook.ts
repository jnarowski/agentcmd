import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { webhookKeys } from "./queryKeys";
import type { Webhook } from "../types/webhook.types";

interface WebhookResponse {
  data: Webhook;
}

/**
 * Fetch single webhook by ID
 */
export function useWebhook(webhookId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: webhookKeys.detail(webhookId!),
    queryFn: async (): Promise<Webhook> => {
      const response = await api.get<WebhookResponse>(`/api/webhooks/${webhookId}`);
      return response.data;
    },
    enabled: options?.enabled !== false && !!webhookId,
  });
}
