import { Terminal } from "lucide-react";
import type { WorkflowEvent } from "../../types";

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
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/5 hover:bg-slate-500/10 transition-colors border-l-2 border-slate-500/20">
      {/* Compact icon */}
      <Terminal className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />

      {/* Compact content - single line */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <code
          className="text-xs font-mono truncate"
          title={fullCommand}
        >
          {fullCommand}
        </code>
        {exitCode !== undefined && (
          <span
            className={`text-xs px-1 rounded ${
              exitCode === 0
                ? "text-green-600 bg-green-500/10"
                : "text-red-600 bg-red-500/10"
            }`}
          >
            {exitCode === 0 ? "✓" : `✗ ${exitCode}`}
          </span>
        )}
        {duration !== undefined && (
          <span className="text-xs text-muted-foreground">
            {duration}ms
          </span>
        )}
      </div>

      {/* Compact timestamp (time only) */}
      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
        {new Date(event.created_at).toLocaleTimeString()}
      </span>
    </div>
  );
}
