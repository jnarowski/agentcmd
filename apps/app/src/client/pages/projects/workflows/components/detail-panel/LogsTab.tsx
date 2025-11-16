import type { WorkflowRun } from "@/client/pages/projects/workflows/types";
import {
  eventToLogEntry,
  traceToLogEntry,
  type UnifiedLogEntry,
  type TraceEntry,
} from "./types";

interface LogsTabProps {
  run: WorkflowRun;
}

export function LogsTab({ run }: LogsTabProps) {
  const steps = run.steps || [];
  const events = run.events || [];

  // Collect ALL logs (with step context when available)
  const allLogs: Array<UnifiedLogEntry & { stepName?: string }> = [];

  // Add traces from all steps
  steps.forEach((step) => {
    const output = step.output as { trace?: TraceEntry[] } | null;
    const traces = output?.trace || [];
    traces.forEach((trace, index) => {
      allLogs.push({
        ...traceToLogEntry(trace, step.started_at, index),
        stepName: step.name,
      });
    });
  });

  // Add all step_log events (with or without step context)
  events
    .filter((e) => e.event_type === "step_log")
    .forEach((event) => {
      const step = steps.find((s) => s.inngest_step_id === event.inngest_step_id);
      allLogs.push({
        ...eventToLogEntry(event),
        stepName: step?.name,
      });
    });

  // Sort chronologically
  allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (allLogs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No logs available
      </div>
    );
  }

  return (
    <div className="bg-muted/20 p-4 space-y-2 border rounded">
      {allLogs.map((log, index) => (
        <LogEntry key={index} log={log} stepName={log.stepName} />
      ))}
    </div>
  );
}

interface LogEntryProps {
  log: UnifiedLogEntry;
  stepName?: string;
}

function LogEntry({ log, stepName }: LogEntryProps) {
  // Color code by log level
  const levelColors = {
    info: "text-foreground",
    warn: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  const levelColor = log.level ? levelColors[log.level] : levelColors.info;

  return (
    <div className="text-xs font-mono space-y-1">
      {/* Timestamp + Step + Level */}
      <div className="flex items-baseline gap-2 text-muted-foreground">
        <span className="flex-shrink-0">
          {log.timestamp.toLocaleTimeString()}
        </span>
        {stepName && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {stepName}
          </span>
        )}
        {log.level && log.level !== "info" && (
          <span className={`font-semibold uppercase ${levelColor}`}>
            [{log.level}]
          </span>
        )}
        {log.command && !stepName && (
          <span className="font-semibold text-foreground">$ {log.command}</span>
        )}
      </div>

      {/* Command on separate line when there's step context */}
      {log.command && stepName && (
        <div className="font-semibold text-foreground">$ {log.command}</div>
      )}

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
