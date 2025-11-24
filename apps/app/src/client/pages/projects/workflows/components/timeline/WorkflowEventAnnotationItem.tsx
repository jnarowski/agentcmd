import { MessageSquare, User } from "lucide-react";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";
import { TimelineRow } from "./TimelineRow";
import { TimelineItemHeader } from "./TimelineItemHeader";
import { formatDate } from "@/shared/utils/formatDate";

interface WorkflowEventAnnotationItemProps {
  event: WorkflowEvent;
}

export function WorkflowEventAnnotationItem({
  event,
}: WorkflowEventAnnotationItemProps) {
  const message = event.event_data?.message || "Annotation";

  return (
    <TimelineRow
      icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
      tooltipLabel="Annotation"
      rightContent={
        <span className="px-2 py-1 text-xs font-medium rounded bg-background/50 text-muted-foreground">
          Annotation
        </span>
      }
    >
      <TimelineItemHeader
        title="Annotation"
        date={formatDate(event.created_at)}
        id={event.id}
      />

      <p className="text-sm whitespace-pre-wrap mt-1">{message}</p>

      {event.created_by_user && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <User className="h-3 w-3" />
          <span className="font-medium">{event.created_by_user.username}</span>
        </div>
      )}
    </TimelineRow>
  );
}
