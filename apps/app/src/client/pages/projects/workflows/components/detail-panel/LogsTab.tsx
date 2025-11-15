import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal } from "lucide-react";
import type { WorkflowRun } from "@/client/pages/projects/workflows/types";
import { mergeLogsChronologically, type UnifiedLogEntry } from "./types";

interface LogsTabProps {
  run: WorkflowRun;
}

export function LogsTab({ run }: LogsTabProps) {
  const steps = run.steps || [];
  const events = run.events || [];

  // Track which steps are expanded (default: all expanded)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    new Set(steps.map((s) => s.id))
  );

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Filter steps that have logs (either trace or step_log events)
  const stepsWithLogs = steps.filter((step) => {
    const output = step.output as { trace?: unknown[] } | null;
    const hasTrace = output?.trace && Array.isArray(output.trace) && output.trace.length > 0;
    const hasEvents = events.some(
      (e) => e.event_type === "step_log" && e.inngest_step_id === step.inngest_step_id
    );
    return hasTrace || hasEvents;
  });

  if (stepsWithLogs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No logs available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stepsWithLogs.map((step) => {
        const logs = mergeLogsChronologically(step, events);
        const isExpanded = expandedSteps.has(step.id);

        return (
          <div key={step.id} className="border rounded">
            {/* Step Header */}
            <button
              onClick={() => toggleStep(step.id)}
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
              <Terminal className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium text-sm">{step.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {logs.length} {logs.length === 1 ? "entry" : "entries"}
              </span>
            </button>

            {/* Step Logs */}
            {isExpanded && (
              <div className="border-t bg-muted/20 p-4 space-y-2">
                {logs.map((log, index) => (
                  <LogEntry key={`${step.id}-${index}`} log={log} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface LogEntryProps {
  log: UnifiedLogEntry;
}

function LogEntry({ log }: LogEntryProps) {
  // Color code by log level
  const levelColors = {
    info: "text-foreground",
    warn: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  const levelColor = log.level ? levelColors[log.level] : levelColors.info;

  return (
    <div className="text-xs font-mono space-y-1">
      {/* Timestamp + Command/Level */}
      <div className="flex items-baseline gap-2 text-muted-foreground">
        <span className="flex-shrink-0">
          {log.timestamp.toLocaleTimeString()}
        </span>
        {log.command && (
          <span className="font-semibold text-foreground">$ {log.command}</span>
        )}
        {log.level && log.level !== "info" && (
          <span className={`font-semibold uppercase ${levelColor}`}>
            [{log.level}]
          </span>
        )}
      </div>

      {/* Log Content */}
      <pre className={`whitespace-pre-wrap ${levelColor} pl-4 border-l-2 border-muted`}>
        {log.content}
      </pre>

      {/* Metadata (exit code, duration) */}
      {(log.exitCode !== undefined || log.duration !== undefined) && (
        <div className="text-muted-foreground flex gap-3 pl-4">
          {log.exitCode !== undefined && (
            <span>
              exit code:{" "}
              <span className={log.exitCode === 0 ? "text-green-600" : "text-red-600"}>
                {log.exitCode}
              </span>
            </span>
          )}
          {log.duration !== undefined && (
            <span>duration: {log.duration}ms</span>
          )}
        </div>
      )}
    </div>
  );
}
