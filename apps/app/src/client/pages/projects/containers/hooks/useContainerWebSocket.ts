import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { Channels } from "@/shared/websocket";
import { containerQueryKeys } from "./queryKeys";

interface ContainerCreatedData {
  containerId: string;
  status: string;
  ports: Record<string, number>;
}

interface ContainerUpdatedData {
  containerId: string;
  changes: {
    status?: string;
  };
}

type ContainerWebSocketEvent =
  | { type: "container.created"; data: ContainerCreatedData }
  | { type: "container.updated"; data: ContainerUpdatedData };

/**
 * Subscribe to container WebSocket events on project channel
 */
export function useContainerWebSocket(projectId: string) {
  const { eventBus, sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  const handleContainerCreated = useCallback(
    () => {
      // Invalidate containers list to show new container
      queryClient.invalidateQueries({
        queryKey: containerQueryKeys.list(projectId),
      });
    },
    [queryClient, projectId],
  );

  const handleContainerUpdated = useCallback(
    (data: ContainerUpdatedData) => {
      // Invalidate container detail query
      queryClient.invalidateQueries({
        queryKey: containerQueryKeys.detail(data.containerId),
      });

      // Invalidate containers list to update status
      queryClient.invalidateQueries({
        queryKey: containerQueryKeys.list(projectId),
      });
    },
    [queryClient, projectId],
  );

  const handleContainerEvent = useCallback(
    (event: unknown) => {
      if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        "data" in event
      ) {
        const containerEvent = event as ContainerWebSocketEvent;
        if (containerEvent.type === "container.created") {
          handleContainerCreated();
        } else if (containerEvent.type === "container.updated") {
          handleContainerUpdated(containerEvent.data);
        }
      }
    },
    [handleContainerCreated, handleContainerUpdated],
  );

  useEffect(() => {
    if (!projectId || !isConnected) return;

    const channel = Channels.project(projectId);

    sendMessage(channel, { type: "subscribe", data: { channels: [channel] } });

    eventBus.on(channel, handleContainerEvent);

    return () => {
      eventBus.off(channel, handleContainerEvent);
    };
  }, [projectId, isConnected, eventBus, sendMessage, handleContainerEvent]);
}
