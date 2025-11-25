import { SquareChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";
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
    >
      <TimelineItemHeader
        title="Command"
        date={formatDate(event.created_at)}
        id={event.id}
      />

      {/* Command trace display */}
      <div className="text-xs font-mono text-muted-foreground mt-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-blue-400 flex-shrink-0">$</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate flex-1 min-w-0">{fullCommand}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md break-words">
              {fullCommand}
            </TooltipContent>
          </Tooltip>
          {duration && (
            <span className="text-gray-500 flex-shrink-0">({duration}ms)</span>
          )}
        </div>
      </div>
    </TimelineRow>
  );
}
