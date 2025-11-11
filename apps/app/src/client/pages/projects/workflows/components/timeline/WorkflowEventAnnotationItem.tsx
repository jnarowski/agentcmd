import { MessageSquare, User } from "lucide-react";
import { useDebugMode } from "@/client/hooks/useDebugMode";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";

interface WorkflowEventAnnotationItemProps {
  event: WorkflowEvent;
}

export function WorkflowEventAnnotationItem({
  event,
}: WorkflowEventAnnotationItemProps) {
  const debugMode = useDebugMode();
  const message = event.event_data?.message || "Annotation";

  return (
    <div className="flex items-start gap-3 p-3 bg-purple-500/10 transition-colors">
      {/* Annotation Icon */}
      <MessageSquare className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />

      {/* Annotation Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {debugMode && (
            <span className="text-xs text-muted-foreground font-mono">
              [EVENT: {event.id}]
            </span>
          )}
          {event.created_by_user && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="font-medium">{event.created_by_user.username}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
          {message}
        </p>

        <div className="text-xs text-muted-foreground mt-1">
          {new Date(event.created_at).toLocaleString()}
        </div>
      </div>

      {/* Event Type Badge */}
      <span className="px-2 py-1 text-xs font-medium rounded bg-background/50 text-muted-foreground flex-shrink-0">
        Annotation
      </span>
    </div>
  );
}
