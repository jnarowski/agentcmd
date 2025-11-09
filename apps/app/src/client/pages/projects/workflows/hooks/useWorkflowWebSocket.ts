import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { Channels } from "@/shared/websocket";
import {
  WorkflowWebSocketEventTypes,
  type WorkflowWebSocketEvent,
  type WorkflowRunUpdatedData,
  type WorkflowStepUpdatedData,
  type WorkflowStepLogChunkData,
  type WorkflowEventCreatedData,
  type WorkflowArtifactCreatedData,
} from "@/shared/types/websocket.types";
import { toast } from "sonner";
import type {
  WorkflowRunDetail,
  WorkflowEvent,
  WorkflowArtifact,
} from "../types";
import { workflowKeys } from "./queryKeys";

export function useWorkflowWebSocket(projectId: string) {
  const { eventBus, sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Handler: workflow:run:updated
  const handleRunUpdated = useCallback(
    (data: WorkflowRunUpdatedData) => {
      const { run_id, changes } = data;

      // Convert date strings to Date objects
      const normalizedChanges: Partial<WorkflowRunDetail> = {};
      if (changes.status !== undefined) normalizedChanges.status = changes.status;
      if (changes.current_phase !== undefined) normalizedChanges.current_phase = changes.current_phase;
      if (changes.current_step !== undefined) normalizedChanges.current_step = changes.current_step;
      if (changes.error_message !== undefined) normalizedChanges.error_message = changes.error_message;
      if (changes.started_at !== undefined) normalizedChanges.started_at = new Date(changes.started_at);
      if (changes.completed_at !== undefined) normalizedChanges.completed_at = new Date(changes.completed_at);
      if (changes.updated_at !== undefined) normalizedChanges.updated_at = new Date(changes.updated_at);

      // Optimistic update: Update detail view (if cached)
      queryClient.setQueryData<WorkflowRunDetail>(
        workflowKeys.run(run_id),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            ...normalizedChanges,
          };
        }
      );

      // Invalidate list queries to refetch
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runs(),
      });

      // Show toast for terminal states
      if (changes.status === "completed") {
        toast.success("Workflow completed successfully");
      } else if (changes.status === "failed") {
        toast.error(`Workflow failed: ${changes.error_message || "Unknown error"}`);
      } else if (changes.status === "cancelled") {
        toast.info("Workflow cancelled");
      }
    },
    [queryClient]
  );

  // Handler: workflow:run:step:updated
  const handleStepUpdated = useCallback(
    (data: WorkflowStepUpdatedData) => {
      const { run_id, step_id, changes } = data;

      // Convert date strings to Date objects
      const normalizedChanges: Partial<{
        status: (typeof changes)["status"];
        logs: string | null;
        error_message: string | null;
        started_at: Date;
        completed_at: Date;
        updated_at: Date;
      }> = {};
      if (changes.status !== undefined) normalizedChanges.status = changes.status;
      if (changes.logs !== undefined) normalizedChanges.logs = changes.logs;
      if (changes.error_message !== undefined) normalizedChanges.error_message = changes.error_message;
      if (changes.started_at !== undefined) normalizedChanges.started_at = new Date(changes.started_at);
      if (changes.completed_at !== undefined) normalizedChanges.completed_at = new Date(changes.completed_at);
      if (changes.updated_at !== undefined) normalizedChanges.updated_at = new Date(changes.updated_at);

      // Optimistic update: Update detail view (if cached)
      queryClient.setQueryData<WorkflowRunDetail>(
        workflowKeys.run(run_id),
        (old) => {
          if (!old || !old.steps) return old;
          return {
            ...old,
            steps: old.steps.map((step) =>
              step.id === step_id
                ? {
                    ...step,
                    ...normalizedChanges,
                  }
                : step
            ),
          };
        }
      );

      // Show toast for step failures
      if (changes.status === "failed") {
        toast.error(`Step failed: ${changes.error_message || "Unknown error"}`);
      }
    },
    [queryClient]
  );

  // Handler: workflow:run:event:created
  const handleEventCreated = useCallback(
    (data: WorkflowEventCreatedData) => {
      const { run_id, event } = data;

      // Convert dates to Date objects and ensure proper types
      const newEvent: WorkflowEvent = {
        ...event,
        event_type: event.event_type as WorkflowEvent["event_type"],
        created_at: new Date(event.created_at),
        inngest_step_id: event.inngest_step_id ?? null,
      };

      // Optimistic update: Add event to detail view (if cached)
      queryClient.setQueryData<WorkflowRunDetail>(
        workflowKeys.run(run_id),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            events: old.events ? [...old.events, newEvent] : [newEvent],
          };
        }
      );
    },
    [queryClient]
  );

  // Handler: workflow:run:artifact:created
  const handleArtifactCreated = useCallback(
    (data: WorkflowArtifactCreatedData) => {
      const { run_id, artifact } = data;

      // Convert dates to Date objects
      const newArtifact: WorkflowArtifact = {
        ...artifact,
        created_at: new Date(artifact.created_at),
        inngest_step_id: artifact.inngest_step_id ?? null,
      };

      // Optimistic update: Add artifact to detail view (if cached)
      queryClient.setQueryData<WorkflowRunDetail>(
        workflowKeys.run(run_id),
        (old) => {
          if (!old) return old;

          // If artifact belongs to a step, update that step's artifacts
          if (artifact.workflow_run_step_id && old.steps) {
            const updatedSteps = old.steps.map((step) =>
              step.id === artifact.workflow_run_step_id
                ? {
                    ...step,
                    artifacts: step.artifacts
                      ? [...step.artifacts, newArtifact]
                      : [newArtifact],
                  }
                : step
            );
            return {
              ...old,
              steps: updatedSteps,
              artifacts: old.artifacts ? [...old.artifacts, newArtifact] : [newArtifact],
            };
          }

          // Otherwise, just add to top-level artifacts
          return {
            ...old,
            artifacts: old.artifacts ? [...old.artifacts, newArtifact] : [newArtifact],
          };
        }
      );
    },
    [queryClient]
  );

  // Handler: workflow:run:step:log_chunk
  const handleLogChunk = useCallback(
    (data: WorkflowStepLogChunkData) => {
      // Emit via event bus for LogsTab to subscribe
      // LogsTab will handle buffering and display
      const eventKey = `workflow:run:${data.run_id}:step:${data.step_id}:log_chunk`;
      eventBus.emit(eventKey, { type: eventKey, data });
    },
    [eventBus]
  );

  // Main event handler
  const handleWorkflowEvent = useCallback(
    (event: WorkflowWebSocketEvent) => {
      switch (event.type) {
        case WorkflowWebSocketEventTypes.RUN_UPDATED:
          handleRunUpdated(event.data);
          break;
        case WorkflowWebSocketEventTypes.STEP_UPDATED:
          handleStepUpdated(event.data);
          break;
        case WorkflowWebSocketEventTypes.STEP_LOG_CHUNK:
          handleLogChunk(event.data);
          break;
        case WorkflowWebSocketEventTypes.EVENT_CREATED:
          handleEventCreated(event.data);
          break;
        case WorkflowWebSocketEventTypes.ARTIFACT_CREATED:
          handleArtifactCreated(event.data);
          break;
        default: {
          // Exhaustive check: if we get here, TypeScript will error
          const _exhaustiveCheck: never = event;
          console.warn("Unknown workflow event type:", _exhaustiveCheck);
        }
      }
    },
    [handleRunUpdated, handleStepUpdated, handleLogChunk, handleEventCreated, handleArtifactCreated]
  );

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Subscribe to project channel
    const channel = Channels.project(projectId);
    sendMessage(channel, { type: "subscribe", data: {} });

    // Register event handler
    eventBus.on(channel, handleWorkflowEvent);

    // Cleanup
    return () => {
      eventBus.off(channel, handleWorkflowEvent);
    };
  }, [projectId, isConnected, eventBus, sendMessage, handleWorkflowEvent]);
}
