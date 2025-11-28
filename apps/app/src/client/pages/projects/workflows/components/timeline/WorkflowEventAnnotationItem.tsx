import { MessageSquare, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    >
      <TimelineItemHeader
        title="Annotation"
        date={formatDate(event.created_at)}
        id={event.id}
      />

      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:mb-1 prose-headings:mt-2 prose-*:first:mt-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message}
        </ReactMarkdown>
      </div>

      {event.created_by_user && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <User className="h-3 w-3" />
          <span className="font-medium">{event.created_by_user.username}</span>
        </div>
      )}
    </TimelineRow>
  );
}
