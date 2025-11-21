import { Terminal } from "lucide-react";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";
import { TimelineRow } from "./TimelineRow";

interface WorkflowEventCommandExecutedItemProps {
  event: WorkflowEvent;
}

export function WorkflowEventCommandExecutedItem({
  event,
}: WorkflowEventCommandExecutedItemProps) {
  const data = event.event_data || {};
  const command = String(data.command || "Unknown command");
  const args = Array.isArray(data.args) ? data.args : [];
  const exitCode = typeof data.exitCode === "number" ? data.exitCode : undefined;
  const duration = typeof data.duration === "number" ? data.duration : undefined;

  // Build full command string for display and tooltip
  const fullCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;

  return (
    <TimelineRow
      icon={<Terminal className="h-5 w-5 text-slate-500" />}
      tooltipLabel="Command Executed"
      rightContent={
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(event.created_at).toLocaleTimeString()}
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <code
          className="text-xs font-mono break-all md:truncate"
          title={fullCommand}
        >
          {fullCommand}
        </code>
        {exitCode !== undefined && (
          <span
            className={`text-xs px-1 rounded flex-shrink-0 ${
              exitCode === 0
                ? "text-green-600 bg-green-500/10"
                : "text-red-600 bg-red-500/10"
            }`}
          >
            {exitCode === 0 ? "✓" : `✗ ${exitCode}`}
          </span>
        )}
        {duration !== undefined && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {duration}ms
          </span>
        )}
      </div>
    </TimelineRow>
  );
}
