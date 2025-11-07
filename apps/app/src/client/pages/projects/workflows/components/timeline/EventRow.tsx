import { WorkflowEventAnnotationItem } from "./WorkflowEventAnnotationItem";
import { WorkflowEventDefaultItem } from "./WorkflowEventDefaultItem";
import type { WorkflowEvent } from "../../types";

interface EventRowProps {
  event: WorkflowEvent;
}

/**
 * EventRow - Discriminates workflow events and delegates to specialized components
 *
 * Specialized components:
 * - WorkflowEventAnnotationItem: annotation_added events
 * - WorkflowEventDefaultItem: fallback for all other event types
 *
 * Add more specialized components here as needed for specific event types.
 */
export function EventRow({ event }: EventRowProps) {
  // Discriminate by event_type and render specialized component
  if (event.event_type === "annotation_added") {
    return <WorkflowEventAnnotationItem event={event} />;
  }

  // Default fallback for all other event types
  return <WorkflowEventDefaultItem event={event} />;
}
