import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket";
import type { WorkflowWebSocketEvent } from "@/shared/types/websocket.types";

/**
 * Broadcast workflow WebSocket event to project room
 *
 * Centralized helper for broadcasting workflow events via WebSocket.
 * All events are broadcast to the project:${projectId} room.
 * Client-side filtering is handled efficiently by React Query cache.
 *
 * @param projectId - Project ID for room targeting
 * @param event - Workflow WebSocket event (type-safe discriminated union)
 *
 * @example
 * ```typescript
 * broadcastWorkflowEvent('project-123', {
 *   type: 'workflow:run:updated',
 *   data: {
 *     run_id: 'run-1',
 *     project_id: 'project-123',
 *     changes: { status: 'running', started_at: new Date() }
 *   }
 * });
 * ```
 */
export function broadcastWorkflowEvent(
  projectId: string,
  event: WorkflowWebSocketEvent
): void {
  // Broadcast to project room channel via WebSocket
  // Connected clients in this room will receive the event in real-time
  broadcast(Channels.project(projectId), event);
}
