import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { Webhook } from "../types/webhook.types";
import { webhookQueryKeys } from "./queryKeys";

interface WebhooksResponse {
  data: Webhook[];
}

async function fetchWebhooks(projectId: string): Promise<Webhook[]> {
  const response = await api.get<WebhooksResponse>(
    `/api/projects/${projectId}/webhooks`,
  );
  return response.data;
}

export function useWebhooks(projectId: string) {
  return useQuery({
    queryKey: webhookQueryKeys.list(projectId),
    queryFn: () => fetchWebhooks(projectId),
    enabled: !!projectId,
  });
}
