import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { Channels } from "@/shared/websocket";
import {
  WorkflowWebSocketEventTypes,
  type WorkflowWebSocketEvent,
  type WorkflowRunUpdatedData,
  type WorkflowStepCreatedData,
  type WorkflowStepUpdatedData,
  type WorkflowStepLogChunkData,
  type WorkflowEventCreatedData,
  type WorkflowArtifactCreatedData,
} from "@/shared/types/websocket.types";
import { toast } from "sonner";
import type {
  WorkflowRunDetail,
  WorkflowRunStep,
  WorkflowEvent,
  WorkflowArtifact,
} from "@/client/pages/projects/workflows/types";
import { workflowKeys } from "./queryKeys";
import { projectKeys } from "@/client/pages/projects/hooks/queryKeys";

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

      // Invalidate project query on terminal states to refresh gitCapabilities
      if (changes.status === "completed" || changes.status === "failed" || changes.status === "cancelled") {
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(data.project_id),
        });
      }
    },
    [queryClient]
  );

  // Handler: workflow:run:step:created
  const handleStepCreated = useCallback(
    (data: WorkflowStepCreatedData) => {
      const { run_id, step } = data;

      // Add new step to cache
      queryClient.setQueryData<WorkflowRunDetail>(
        workflowKeys.run(run_id),
        (old) => {
          if (!old) return old;

          // Avoid duplicates
          const exists = old.steps?.some((s) => s.id === step.id);
          if (exists) return old;

          // Cast step_type to the union type and create minimal step
          const newStep: WorkflowRunStep = {
            id: step.id,
            workflow_run_id: step.workflow_run_id,
            inngest_step_id: step.inngest_step_id,
            name: step.name,
            step_type: step.step_type as WorkflowRunStep["step_type"],
            status: step.status,
            phase: step.phase,
            created_at: new Date(step.created_at),
            started_at: step.started_at ? new Date(step.started_at) : null,
            completed_at: null,
            updated_at: new Date(step.created_at),
            error_message: null,
            agent_session_id: null,
            args: null,
            output: null,
          } as WorkflowRunStep;

          return {
            ...old,
            steps: [...(old.steps || []), newStep],
          };
        }
      );
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
        agent_session_id: string | null;
      }> = {};
      if (changes.status !== undefined) normalizedChanges.status = changes.status;
      if (changes.logs !== undefined) normalizedChanges.logs = changes.logs;
      if (changes.error_message !== undefined) normalizedChanges.error_message = changes.error_message;
      if (changes.started_at !== undefined) normalizedChanges.started_at = new Date(changes.started_at);
      if (changes.completed_at !== undefined) normalizedChanges.completed_at = new Date(changes.completed_at);
      if (changes.updated_at !== undefined) normalizedChanges.updated_at = new Date(changes.updated_at);
      if (changes.agent_session_id !== undefined) normalizedChanges.agent_session_id = changes.agent_session_id;

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

          // If artifact attached to event, add to that event's artifacts
          let updatedEvents = old.events;
          if (newArtifact.workflow_event_id && old.events) {
            updatedEvents = old.events.map((event) =>
              event.id === newArtifact.workflow_event_id
                ? {
                    ...event,
                    artifacts: event.artifacts
                      ? [...event.artifacts, newArtifact]
                      : [newArtifact],
                  }
                : event
            );
          }

          // Always add to top-level artifacts
          return {
            ...old,
            events: updatedEvents,
            artifacts: old.artifacts ? [...old.artifacts, newArtifact] : [newArtifact],
          };
        }
      );
    },
    [queryClient]
  );

  // Handler: workflow.run.step.log_chunk
  const handleLogChunk = useCallback(
    (data: WorkflowStepLogChunkData) => {
      // Emit via event bus for LogsTab to subscribe
      // LogsTab will handle buffering and display
      const eventKey = `workflow.run.${data.run_id}.step.${data.step_id}.log_chunk`;
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
        case WorkflowWebSocketEventTypes.STEP_CREATED:
          handleStepCreated(event.data);
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
    [handleRunUpdated, handleStepCreated, handleStepUpdated, handleLogChunk, handleEventCreated, handleArtifactCreated]
  );

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Subscribe to project channel
    const channel = Channels.project(projectId);

    sendMessage(channel, { type: "subscribe", data: { channels: [channel] } });

    // Register event handler
    eventBus.on(channel, handleWorkflowEvent);

    // Refetch workflow runs after subscription to catch any events
    // fired during the race window between initial fetch and subscription
    queryClient.invalidateQueries({
      queryKey: workflowKeys.runs(),
    });

    // Cleanup
    return () => {
      eventBus.off(channel, handleWorkflowEvent);
    };
  }, [projectId, isConnected, eventBus, sendMessage, handleWorkflowEvent, queryClient]);
}
