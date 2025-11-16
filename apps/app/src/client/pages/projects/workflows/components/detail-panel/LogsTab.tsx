import type { WorkflowRun, WorkflowRunStep } from "@/client/pages/projects/workflows/types";
import {
  eventToLogEntry,
  type UnifiedLogEntry,
} from "./types";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/client/components/ai-elements/conversation";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";

interface LogsTabProps {
  run: WorkflowRun;
}

// Extended log entry with step lifecycle support
interface ExtendedLogEntry extends UnifiedLogEntry {
  stepName?: string;
  stepStatus?: WorkflowRunStep["status"];
  stepType?: WorkflowRunStep["step_type"];
  stepArgs?: WorkflowRunStep["args"];
  stepOutput?: WorkflowRunStep["output"];
  stepDuration?: number;
}

export function LogsTab({ run }: LogsTabProps) {
  const steps = run.steps || [];
  const events = run.events || [];

  // Collect ALL logs (with step context when available)
  const allLogs: ExtendedLogEntry[] = [];

  // Add step lifecycle entries (started, completed, failed)
  steps.forEach((step) => {
    // Step started entry
    if (step.started_at) {
      allLogs.push({
        source: "trace",
        timestamp: new Date(step.started_at),
        content: "Started",
        stepName: step.name,
        stepStatus: "running",
        stepType: step.step_type,
        stepArgs: step.args,
      });
    }

    // Step completed/failed entry
    if (step.completed_at) {
      const duration = step.started_at && step.completed_at
        ? new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()
        : undefined;

      allLogs.push({
        source: "trace",
        timestamp: new Date(step.completed_at),
        content: step.status === "failed"
          ? `Failed${step.error_message ? `: ${step.error_message}` : ""}`
          : "Completed",
        level: step.status === "failed" ? "error" : "info",
        stepName: step.name,
        stepStatus: step.status,
        stepType: step.step_type,
        stepOutput: step.output,
        stepDuration: duration,
      });
    }
  });

  // Note: Traces are not added separately since they're already included in step.output

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
    <Conversation className="h-full">
      <ConversationContent className="p-6">
        <div className="bg-muted/20 p-4 space-y-2 border rounded">
          {allLogs.map((log, index) => (
            <LogEntry key={index} log={log} />
          ))}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

interface LogEntryProps {
  log: ExtendedLogEntry;
}

function LogEntry({ log }: LogEntryProps) {
  // Color code by log level
  const levelColors = {
    info: "text-foreground",
    warn: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  const levelColor = log.level ? levelColors[log.level] : levelColors.info;

  // Status badge colors
  const statusColors = {
    pending: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
    running: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    completed: "bg-green-500/20 text-green-600 dark:text-green-400",
    failed: "bg-red-500/20 text-red-600 dark:text-red-400",
    skipped: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
  };

  return (
    <div className="text-xs font-mono space-y-1">
      {/* Timestamp + Step + Level + Status */}
      <div className="flex items-baseline gap-2 text-muted-foreground">
        <span className="flex-shrink-0">
          {log.timestamp.toLocaleTimeString()}
        </span>
        {log.stepName && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {log.stepName}
          </span>
        )}
        {log.stepStatus && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[log.stepStatus]}`}>
            {log.stepStatus}
          </span>
        )}
        {log.level && log.level !== "info" && (
          <span className={`font-semibold uppercase ${levelColor}`}>
            [{log.level}]
          </span>
        )}
        {log.command && !log.stepName && (
          <span className="font-semibold text-foreground">$ {log.command}</span>
        )}
      </div>

      {/* Command on separate line when there's step context */}
      {log.command && log.stepName && (
        <div className="font-semibold text-foreground">$ {log.command}</div>
      )}

      {/* Log Content (skip for lifecycle entries - status badge is enough) */}
      {log.content && log.content !== "Started" && log.content !== "Completed" && !log.content.startsWith("Failed") && (
        <pre className={`whitespace-pre-wrap ${levelColor} pl-4 border-l-2 border-muted`}>
          {log.content}
        </pre>
      )}

      {/* Failed message (only show error, not "Failed:" prefix) */}
      {log.content && log.content.startsWith("Failed") && (
        <pre className={`whitespace-pre-wrap ${levelColor} pl-4 border-l-2 border-muted`}>
          {log.content.replace(/^Failed: /, '')}
        </pre>
      )}

      {/* Step args (only shown when step starts) */}
      {log.stepArgs && (
        <div className="pl-4">
          <div className="font-semibold mb-1 text-muted-foreground text-xs">Args:</div>
          <SyntaxHighlighter
            code={JSON.stringify(log.stepArgs, null, 2)}
            language="json"
            className="text-xs [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full"
          />
        </div>
      )}

      {/* Step output (only shown when step completes) */}
      {log.stepOutput && (
        <div className="pl-4">
          <div className="font-semibold mb-1 text-muted-foreground text-xs">Output:</div>
          <SyntaxHighlighter
            code={JSON.stringify(log.stepOutput, null, 2)}
            language="json"
            className="text-xs [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full"
          />
        </div>
      )}

      {/* Metadata (exit code, duration) */}
      {(log.exitCode !== undefined || log.duration !== undefined || log.stepDuration !== undefined) && (
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
          {log.stepDuration !== undefined && (
            <span>duration: {(log.stepDuration / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}
    </div>
  );
}
