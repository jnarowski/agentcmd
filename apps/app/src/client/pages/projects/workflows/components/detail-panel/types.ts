import type { WorkflowEvent, WorkflowRunStep } from "@/client/pages/projects/workflows/types";

/**
 * Trace entry from step.output.trace (CLI/git commands)
 */
export interface TraceEntry {
  command: string;
  output?: string;
  exitCode?: number;
  duration?: number;
}

/**
 * Unified log entry combining traces and step_log events
 */
export interface UnifiedLogEntry {
  /** Source of the log entry */
  source: "trace" | "event";
  /** Estimated or actual timestamp */
  timestamp: Date;
  /** Command that was executed (trace only) */
  command?: string;
  /** Log content or command output */
  content: string;
  /** Log level (event only) */
  level?: "info" | "warn" | "error";
  /** Exit code for CLI commands (trace only) */
  exitCode?: number;
  /** Execution duration in ms (trace only) */
  duration?: number;
  /** Original event ID (event only) */
  eventId?: string;
}

/**
 * Convert trace entry to unified log entry
 * Estimates timestamp based on step start time + index offset
 */
export function traceToLogEntry(
  trace: TraceEntry,
  stepStartedAt: Date | string | null,
  index: number
): UnifiedLogEntry {
  // Estimate timestamp: step start + (index * 100ms)
  // Handle both Date objects and ISO strings from API
  const startDate = stepStartedAt
    ? stepStartedAt instanceof Date
      ? stepStartedAt
      : new Date(stepStartedAt)
    : null;

  const timestamp = startDate
    ? new Date(startDate.getTime() + index * 100)
    : new Date();

  return {
    source: "trace",
    timestamp,
    command: trace.command,
    content: trace.output || "(no output)",
    exitCode: trace.exitCode,
    duration: trace.duration,
  };
}

/**
 * Convert step_log event to unified log entry
 */
export function eventToLogEntry(event: WorkflowEvent): UnifiedLogEntry {
  const eventData = event.event_data as {
    level?: "info" | "warn" | "error";
    message?: string;
  };

  // Handle both Date objects and ISO strings from API
  const timestamp = event.created_at instanceof Date
    ? event.created_at
    : new Date(event.created_at);

  return {
    source: "event",
    timestamp,
    content: eventData.message || "(empty log)",
    level: eventData.level || "info",
    eventId: event.id,
  };
}

/**
 * Merge traces and events chronologically
 * Groups by step, sorts by timestamp within each step
 */
export function mergeLogsChronologically(
  step: WorkflowRunStep,
  events: WorkflowEvent[]
): UnifiedLogEntry[] {
  const logs: UnifiedLogEntry[] = [];

  // Extract traces from step.output
  const output = step.output as { trace?: TraceEntry[] } | null;
  const traces = output?.trace || [];

  // Convert traces to log entries
  traces.forEach((trace, index) => {
    logs.push(traceToLogEntry(trace, step.started_at, index));
  });

  // Filter events for this step and convert to log entries
  const stepEvents = events.filter(
    (e) => e.event_type === "step_log" && e.inngest_step_id === step.inngest_step_id
  );

  stepEvents.forEach((event) => {
    logs.push(eventToLogEntry(event));
  });

  // Sort chronologically
  return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
