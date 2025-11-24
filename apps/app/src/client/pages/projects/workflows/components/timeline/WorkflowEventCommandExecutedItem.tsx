import { SquareChevronRight } from "lucide-react";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";
import { TimelineRow } from "./TimelineRow";
import { TimelineItemHeader } from "./TimelineItemHeader";
import { formatDate } from "@/shared/utils/formatDate";

interface WorkflowEventCommandExecutedItemProps {
  event: WorkflowEvent;
}

export function WorkflowEventCommandExecutedItem({
  event,
}: WorkflowEventCommandExecutedItemProps) {
  const data = event.event_data || {};
  const command = String(data.command || "Unknown command");
  const args = Array.isArray(data.args) ? data.args : [];
  const duration =
    typeof data.duration === "number" ? data.duration : undefined;

  // Build full command string for display and tooltip
  const fullCommand =
    args.length > 0 ? `${command} ${args.join(" ")}` : command;

  return (
    <TimelineRow
      icon={<SquareChevronRight className="h-5 w-5 text-slate-500" />}
      tooltipLabel="Command"
      rightContent={
        <span className="px-2 py-1 text-xs font-medium rounded bg-background/50 text-muted-foreground">
          Command
        </span>
      }
    >
      <TimelineItemHeader
        title={
          <code className="text-workflow-row-title text-base font-mono">
            {fullCommand}
          </code>
        }
        date={formatDate(event.created_at)}
        duration={duration}
        id={event.id}
        truncate={true}
      />
    </TimelineRow>
  );
}
