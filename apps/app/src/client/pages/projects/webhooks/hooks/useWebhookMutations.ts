import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/client/utils/api";
import { webhookKeys } from "./queryKeys";
import type { Webhook, WebhookFormData } from "../types/webhook.types";

interface UpdateWebhookInput {
  webhookId: string;
  data: Partial<WebhookFormData>;
}

interface RotateSecretResponse {
  secret: string;
}

/**
 * All webhook mutations with proper invalidation and navigation
 */
export function useWebhookMutations(projectId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Create webhook
  const createMutation = useMutation({
    mutationFn: async (data: Partial<WebhookFormData>): Promise<Webhook> => {
      const result = await api.post<{ data: Webhook }>(
        `/api/projects/${projectId}/webhooks`,
        data
      );
      return result.data;
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.list(projectId) });
      toast.success("Webhook created", {
        description: "Configure your webhook settings below",
      });
      navigate(`/projects/${projectId}/webhooks/${webhook.id}/edit`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create webhook", {
        description: error.message,
      });
    },
  });

  // Update webhook
  const updateMutation = useMutation({
    mutationFn: async ({ webhookId, data }: UpdateWebhookInput): Promise<Webhook> => {
      const result = await api.patch<{ data: Webhook }>(
        `/api/webhooks/${webhookId}`,
        data
      );
      return result.data;
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(webhook.id) });
      queryClient.invalidateQueries({ queryKey: webhookKeys.list(webhook.project_id) });
      toast.success("Webhook updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update webhook", {
        description: error.message,
      });
    },
  });

  // Activate webhook
  const activateMutation = useMutation({
    mutationFn: async ({ webhookId }: { webhookId: string }): Promise<Webhook> => {
      const result = await api.post<{ data: Webhook }>(
        `/api/webhooks/${webhookId}/activate`
      );
      return result.data;
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(webhook.id) });
      queryClient.invalidateQueries({ queryKey: webhookKeys.list(webhook.project_id) });
      toast.success("Webhook activated", {
        description: "Webhook is now ready to receive events",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to activate webhook", {
        description: error.message,
      });
    },
  });

  // Pause webhook
  const pauseMutation = useMutation({
    mutationFn: async ({ webhookId }: { webhookId: string }): Promise<Webhook> => {
      const result = await api.post<{ data: Webhook }>(
        `/api/webhooks/${webhookId}/pause`
      );
      return result.data;
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(webhook.id) });
      queryClient.invalidateQueries({ queryKey: webhookKeys.list(webhook.project_id) });
      toast.success("Webhook paused");
    },
    onError: (error: Error) => {
      toast.error("Failed to pause webhook", {
        description: error.message,
      });
    },
  });

  // Rotate secret
  const rotateSecretMutation = useMutation({
    mutationFn: async ({ webhookId }: { webhookId: string }): Promise<RotateSecretResponse> => {
      const result = await api.post<{ data: RotateSecretResponse }>(
        `/api/webhooks/${webhookId}/rotate-secret`
      );
      return result.data;
    },
    onSuccess: (_data, { webhookId }) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(webhookId) });
      toast.success("Secret rotated", {
        description: "Update your webhook configuration with the new secret",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to rotate secret", {
        description: error.message,
      });
    },
  });

  // Delete webhook
  const deleteMutation = useMutation({
    mutationFn: async ({ webhookId }: { webhookId: string }): Promise<void> => {
      await api.delete(`/api/webhooks/${webhookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.list(projectId) });
      toast.success("Webhook deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete webhook", {
        description: error.message,
      });
    },
  });

  return {
    createMutation,
    updateMutation,
    activateMutation,
    pauseMutation,
    rotateSecretMutation,
    deleteMutation,
  };
}
