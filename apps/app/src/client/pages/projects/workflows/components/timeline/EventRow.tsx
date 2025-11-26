import { WorkflowEventAnnotationItem } from "./WorkflowEventAnnotationItem";
import { WorkflowEventCommandExecutedItem } from "./WorkflowEventCommandExecutedItem";
import { WorkflowEventDefaultItem } from "./WorkflowEventDefaultItem";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";

interface EventRowProps {
  event: WorkflowEvent;
}

/**
 * EventRow - Discriminates workflow events and delegates to specialized components
 *
 * Specialized components:
 * - WorkflowEventAnnotationItem: annotation_added events
 * - WorkflowEventCommandExecutedItem: command_executed events (compact display)
 * - WorkflowEventDefaultItem: fallback for all other event types
 *
 * Add more specialized components here as needed for specific event types.
 */
export function EventRow({ event }: EventRowProps) {
  // Discriminate by event_type and render specialized component
  if (event.event_type === "annotation_added") {
    return <WorkflowEventAnnotationItem event={event} />;
  }

  if (event.event_type === "command_executed") {
    return <WorkflowEventCommandExecutedItem event={event} />;
  }

  // Default fallback for all other event types
  return <WorkflowEventDefaultItem event={event} />;
}
