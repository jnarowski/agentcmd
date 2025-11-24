import { SquareChevronRight } from "lucide-react";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";
import { TimelineRow } from "./TimelineRow";
import { formatDateShort } from "@/client/pages/projects/workflows/utils/dateFormatting";

interface WorkflowEventCommandExecutedItemProps {
  event: WorkflowEvent;
}

export function WorkflowEventCommandExecutedItem({
  event,
}: WorkflowEventCommandExecutedItemProps) {
  const data = event.event_data || {};
  const command = String(data.command || "Unknown command");
  const args = Array.isArray(data.args) ? data.args : [];
  const exitCode =
    typeof data.exitCode === "number" ? data.exitCode : undefined;
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
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <code
          className="font-medium font-mono break-all md:truncate"
          title={fullCommand}
        >
          {fullCommand}
        </code>
      </div>

      <div className="text-xs text-muted-foreground mt-1">
        {formatDateShort(event.created_at)}
        {duration !== undefined && (
          <>
            <span className="mx-1">•</span>
            <span>{duration}ms</span>
          </>
        )}
      </div>
    </TimelineRow>
  );
}
