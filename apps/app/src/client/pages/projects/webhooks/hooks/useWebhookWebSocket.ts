import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { Channels } from "@/shared/websocket";
import {
  WebhookEventTypes,
  type WebhookWebSocketEvent,
  type WebhookEventReceivedData,
} from "@/shared/types/websocket.types";
import { webhookKeys } from "./queryKeys";

/**
 * Subscribe to webhook WebSocket events on project channel
 */
export function useWebhookWebSocket(projectId: string, webhookId?: string) {
  const { eventBus, sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Handler: webhook.event_received
  const handleEventReceived = useCallback(
    (data: WebhookEventReceivedData) => {
      // Filter by webhookId if provided
      if (webhookId && data.webhook_id !== webhookId) {
        return;
      }

      // Invalidate queries to refresh data
      if (webhookId) {
        queryClient.invalidateQueries({
          queryKey: webhookKeys.events(webhookId),
        });
        queryClient.invalidateQueries({
          queryKey: webhookKeys.testEvent(webhookId),
        });
      }

      // Invalidate webhook list
      queryClient.invalidateQueries({
        queryKey: webhookKeys.list(projectId),
      });
    },
    [queryClient, webhookId, projectId]
  );

  // Main event handler
  const handleWebhookEvent = useCallback(
    (event: unknown) => {
      // Type guard to filter webhook events
      if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        event.type === WebhookEventTypes.EVENT_RECEIVED
      ) {
        const webhookEvent = event as WebhookWebSocketEvent;
        handleEventReceived(webhookEvent.data);
      }
    },
    [handleEventReceived]
  );

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Subscribe to project channel
    const channel = Channels.project(projectId);

    sendMessage(channel, { type: "subscribe", data: { channels: [channel] } });

    // Register event handler
    eventBus.on(channel, handleWebhookEvent);

    // Cleanup
    return () => {
      eventBus.off(channel, handleWebhookEvent);
    };
  }, [projectId, isConnected, eventBus, sendMessage, handleWebhookEvent]);
}
