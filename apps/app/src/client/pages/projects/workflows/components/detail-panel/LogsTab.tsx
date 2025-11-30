import { useEffect } from "react";
import type {
  WorkflowRun,
  WorkflowRunStep,
} from "@/client/pages/projects/workflows/types";
import { eventToLogEntry, type UnifiedLogEntry } from "./types";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/client/components/ai-elements/conversation";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";
import { Copy, Check } from "lucide-react";
import { formatDate } from "@/shared/utils/formatDate";
import { TruncatedError } from "@/client/components/TruncatedError";
import { useCopy } from "@/client/hooks/useCopy";

interface LogsTabProps {
  run: WorkflowRun;
  selectedStepId: string | null;
}

// Extended log entry with step lifecycle support
interface ExtendedLogEntry extends UnifiedLogEntry {
  stepId?: string;
  stepName?: string;
  stepStatus?: WorkflowRunStep["status"];
  stepType?: WorkflowRunStep["step_type"];
  stepArgs?: WorkflowRunStep["args"];
  stepOutput?: WorkflowRunStep["output"];
  stepDuration?: number;
}

export function LogsTab({ run, selectedStepId }: LogsTabProps) {
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
        stepId: step.id,
        stepName: step.name,
        stepStatus: "running",
        stepType: step.step_type,
        stepArgs: step.args,
      });
    }

    // Step completed/failed entry
    if (step.completed_at) {
      const duration =
        step.started_at && step.completed_at
          ? new Date(step.completed_at).getTime() -
            new Date(step.started_at).getTime()
          : undefined;

      allLogs.push({
        source: "trace",
        timestamp: new Date(step.completed_at),
        content:
          step.status === "failed"
            ? `Failed${step.error_message ? `: ${step.error_message}` : ""}`
            : "Completed",
        level: step.status === "failed" ? "error" : "info",
        stepId: step.id,
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
      const step = steps.find(
        (s) => s.inngest_step_id === event.inngest_step_id
      );
      allLogs.push({
        ...eventToLogEntry(event),
        stepId: step?.id,
        stepName: step?.name,
      });
    });

  // Sort chronologically
  allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Scroll to selected step's first log when selectedStepId changes
  useEffect(() => {
    if (selectedStepId) {
      const firstLogElement = document.querySelector(
        `[data-step-id="${selectedStepId}"]`
      );
      if (firstLogElement) {
        firstLogElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [selectedStepId]);

  if (allLogs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No logs available
      </div>
    );
  }

  return (
    <Conversation className="h-full">
      <ConversationContent>
        <div className="bg-muted/20 p-6 space-y-2 border rounded">
          {allLogs.map((log, index) => (
            <LogEntry key={index} log={log} selectedStepId={selectedStepId} />
          ))}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

interface LogEntryProps {
  log: ExtendedLogEntry;
  selectedStepId: string | null;
}

function CopyButton({ content }: { content: string }) {
  const { copied, copy } = useCopy();

  return (
    <button
      onClick={() => copy(content)}
      className="p-1.5 hover:bg-muted rounded-md transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Copy className="w-3 h-3 text-muted-foreground" />
      )}
    </button>
  );
}

function LogEntry({ log, selectedStepId }: LogEntryProps) {
  // Color code by log level
  const levelColors = {
    info: "text-foreground",
    warn: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  const levelColor = log.level ? levelColors[log.level] : levelColors.info;

  // Status badge colors
  const statusColors: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
    running: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    completed: "bg-green-500/20 text-green-600 dark:text-green-400",
    failed: "bg-red-500/20 text-red-600 dark:text-red-400",
    skipped: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
    cancelled: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
  };

  const isSelected = log.stepId && log.stepId === selectedStepId;

  return (
    <div
      className={`text-xs font-mono space-y-1 ${isSelected ? "bg-blue-500/10 -mx-2 px-2 py-1 rounded" : ""}`}
      data-step-id={log.stepId}
    >
      {/* Timestamp + Step + Level + Status */}
      <div className="flex items-baseline gap-2 text-muted-foreground">
        <span className="flex-shrink-0">
          {formatDate(log.timestamp, "h:mm:ss a")}
        </span>
        {log.stepName && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {log.stepName}
          </span>
        )}
        {log.stepStatus && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[log.stepStatus]}`}
          >
            {log.stepStatus}
          </span>
        )}
        {log.level && (
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
      {log.content &&
        log.content !== "Started" &&
        log.content !== "Completed" &&
        !log.content.startsWith("Failed") && (
          <pre
            className={`whitespace-pre-wrap break-words ${levelColor} pl-4 border-l-2 border-muted`}
          >
            {log.content}
          </pre>
        )}

      {/* Failed message (only show error, not "Failed:" prefix) */}
      {log.content && log.content.startsWith("Failed") && (
        <div className={`${levelColor} pl-4 border-l-2 border-muted`}>
          <TruncatedError
            error={log.content.replace(/^Failed: /, "")}
            maxLength={200}
            side="top"
            className="text-xs font-mono"
          />
        </div>
      )}

      {/* Step args (only shown when step starts) */}
      {log.stepArgs && (
        <div className="pl-4">
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground list-none flex items-center gap-1">
              <span className="inline-block transition-transform group-open:rotate-90">
                ▶
              </span>
              Args
            </summary>
            <div className="mt-1 relative">
              <div className="absolute top-2 right-2 z-10">
                <CopyButton content={JSON.stringify(log.stepArgs, null, 2)} />
              </div>
              <SyntaxHighlighter
                code={JSON.stringify(log.stepArgs, null, 2)}
                language="json"
                className="text-xs [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full [&_pre]:rounded-md"
              />
            </div>
          </details>
        </div>
      )}

      {/* Step output (only shown when step completes) */}
      {log.stepOutput && (
        <div className="pl-4">
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground list-none flex items-center gap-1">
              <span className="inline-block transition-transform group-open:rotate-90">
                ▶
              </span>
              Output
            </summary>
            <div className="mt-1 relative">
              <div className="absolute top-2 right-2 z-10">
                <CopyButton content={JSON.stringify(log.stepOutput, null, 2)} />
              </div>
              <SyntaxHighlighter
                code={JSON.stringify(log.stepOutput, null, 2)}
                language="json"
                className="text-xs [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full [&_pre]:rounded-md"
              />
            </div>
          </details>
        </div>
      )}

      {/* Metadata (exit code, duration) */}
      {(log.exitCode !== undefined ||
        log.duration !== undefined ||
        log.stepDuration !== undefined) && (
        <div className="text-muted-foreground flex gap-3 pl-4">
          {log.exitCode !== undefined && (
            <span>
              exit code:{" "}
              <span
                className={
                  log.exitCode === 0 ? "text-green-600" : "text-red-600"
                }
              >
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
