import { describe, it, expect } from "vitest";
import {
  traceToLogEntry,
  eventToLogEntry,
  mergeLogsChronologically,
  type TraceEntry,
} from "./types";
import type {
  WorkflowEvent,
  WorkflowRunStep,
} from "@/client/pages/projects/workflows/types";

describe("traceToLogEntry", () => {
  it("converts trace entry to unified log entry", () => {
    const trace: TraceEntry = {
      command: "npm test",
      output: "All tests passed",
      exitCode: 0,
      duration: 1234,
    };

    const stepStartedAt = new Date("2025-01-15T10:00:00Z");
    const result = traceToLogEntry(trace, stepStartedAt, 0);

    expect(result).toEqual({
      source: "trace",
      timestamp: stepStartedAt,
      command: "npm test",
      content: "All tests passed",
      exitCode: 0,
      duration: 1234,
    });
  });

  it("estimates timestamp based on index", () => {
    const trace: TraceEntry = {
      command: "echo hello",
      output: "hello",
    };

    const stepStartedAt = new Date("2025-01-15T10:00:00.000Z");
    const result1 = traceToLogEntry(trace, stepStartedAt, 0);
    const result2 = traceToLogEntry(trace, stepStartedAt, 1);
    const result3 = traceToLogEntry(trace, stepStartedAt, 2);

    expect(result1.timestamp.getTime()).toBe(stepStartedAt.getTime());
    expect(result2.timestamp.getTime()).toBe(stepStartedAt.getTime() + 100);
    expect(result3.timestamp.getTime()).toBe(stepStartedAt.getTime() + 200);
  });

  it("handles missing output with default message", () => {
    const trace: TraceEntry = {
      command: "ls",
    };

    const result = traceToLogEntry(trace, new Date(), 0);

    expect(result.content).toBe("(no output)");
  });

  it("handles null stepStartedAt by using current time", () => {
    const trace: TraceEntry = {
      command: "test",
      output: "output",
    };

    const before = Date.now();
    const result = traceToLogEntry(trace, null, 0);
    const after = Date.now();

    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.timestamp.getTime()).toBeLessThanOrEqual(after);
  });
});

describe("eventToLogEntry", () => {
  it("converts step_log event to unified log entry", () => {
    const event: WorkflowEvent = {
      id: "event-123",
      workflow_run_id: "run-123",
      event_type: "step_log",
      event_data: {
        level: "info",
        message: "Test log message",
        args: ["Test", "log", "message"],
      },
      phase: "test",
      inngest_step_id: "step-123",
      created_by_user_id: null,
      created_at: new Date("2025-01-15T10:00:05Z"),
    };

    const result = eventToLogEntry(event);

    expect(result).toEqual({
      source: "event",
      timestamp: event.created_at,
      content: "Test log message",
      level: "info",
      eventId: "event-123",
    });
  });

  it("handles warn level", () => {
    const event: WorkflowEvent = {
      id: "event-123",
      workflow_run_id: "run-123",
      event_type: "step_log",
      event_data: {
        level: "warn",
        message: "Warning message",
        args: ["Warning", "message"],
      },
      phase: "test",
      inngest_step_id: "step-123",
      created_by_user_id: null,
      created_at: new Date(),
    };

    const result = eventToLogEntry(event);

    expect(result.level).toBe("warn");
  });

  it("handles error level", () => {
    const event: WorkflowEvent = {
      id: "event-123",
      workflow_run_id: "run-123",
      event_type: "step_log",
      event_data: {
        level: "error",
        message: "Error message",
        args: ["Error", "message"],
      },
      phase: "test",
      inngest_step_id: "step-123",
      created_by_user_id: null,
      created_at: new Date(),
    };

    const result = eventToLogEntry(event);

    expect(result.level).toBe("error");
  });

  it("defaults to info level if missing", () => {
    const event: WorkflowEvent = {
      id: "event-123",
      workflow_run_id: "run-123",
      event_type: "step_log",
      event_data: {
        message: "Message without level",
        args: [],
      },
      phase: "test",
      inngest_step_id: "step-123",
      created_by_user_id: null,
      created_at: new Date(),
    };

    const result = eventToLogEntry(event);

    expect(result.level).toBe("info");
  });

  it("handles missing message with default", () => {
    const event: WorkflowEvent = {
      id: "event-123",
      workflow_run_id: "run-123",
      event_type: "step_log",
      event_data: {
        level: "info",
        args: [],
      },
      phase: "test",
      inngest_step_id: "step-123",
      created_by_user_id: null,
      created_at: new Date(),
    };

    const result = eventToLogEntry(event);

    expect(result.content).toBe("(empty log)");
  });
});

describe("mergeLogsChronologically", () => {
  it("merges traces and events by timestamp", () => {
    const step: WorkflowRunStep = {
      id: "step-123",
      workflow_run_id: "run-123",
      inngest_step_id: "inngest-step-123",
      name: "Test Step",
      phase: "test",
      status: "completed",
      output: {
        trace: [
          { command: "echo first", output: "first" },
          { command: "echo second", output: "second" },
        ],
      },
      log_directory_path: null,
      agent_session_id: null,
      error_message: null,
      started_at: new Date("2025-01-15T10:00:00.000Z"),
      completed_at: new Date("2025-01-15T10:00:10.000Z"),
      created_at: new Date("2025-01-15T10:00:00.000Z"),
      updated_at: new Date("2025-01-15T10:00:10.000Z"),
    };

    const events: WorkflowEvent[] = [
      {
        id: "event-1",
        workflow_run_id: "run-123",
        event_type: "step_log",
        event_data: {
          level: "info",
          message: "Between commands",
          args: [],
        },
        phase: "test",
        inngest_step_id: "inngest-step-123",
        created_by_user_id: null,
        created_at: new Date("2025-01-15T10:00:00.050Z"), // Between trace 0 and 1
      },
    ];

    const merged = mergeLogsChronologically(step, events);

    expect(merged).toHaveLength(3);
    expect(merged[0].source).toBe("trace");
    expect(merged[0].command).toBe("echo first");
    expect(merged[1].source).toBe("event");
    expect(merged[1].content).toBe("Between commands");
    expect(merged[2].source).toBe("trace");
    expect(merged[2].command).toBe("echo second");
  });

  it("filters events by step inngest_step_id", () => {
    const step: WorkflowRunStep = {
      id: "step-123",
      workflow_run_id: "run-123",
      inngest_step_id: "inngest-step-123",
      name: "Test Step",
      phase: "test",
      status: "completed",
      output: null,
      log_directory_path: null,
      agent_session_id: null,
      error_message: null,
      started_at: new Date(),
      completed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const events: WorkflowEvent[] = [
      {
        id: "event-1",
        workflow_run_id: "run-123",
        event_type: "step_log",
        event_data: { level: "info", message: "For this step", args: [] },
        phase: "test",
        inngest_step_id: "inngest-step-123",
        created_by_user_id: null,
        created_at: new Date(),
      },
      {
        id: "event-2",
        workflow_run_id: "run-123",
        event_type: "step_log",
        event_data: { level: "info", message: "For different step", args: [] },
        phase: "test",
        inngest_step_id: "different-step",
        created_by_user_id: null,
        created_at: new Date(),
      },
    ];

    const merged = mergeLogsChronologically(step, events);

    expect(merged).toHaveLength(1);
    expect(merged[0].content).toBe("For this step");
  });

  it("filters events by event_type step_log", () => {
    const step: WorkflowRunStep = {
      id: "step-123",
      workflow_run_id: "run-123",
      inngest_step_id: "inngest-step-123",
      name: "Test Step",
      phase: "test",
      status: "completed",
      output: null,
      log_directory_path: null,
      agent_session_id: null,
      error_message: null,
      started_at: new Date(),
      completed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const events: WorkflowEvent[] = [
      {
        id: "event-1",
        workflow_run_id: "run-123",
        event_type: "step_log",
        event_data: { level: "info", message: "Log event", args: [] },
        phase: "test",
        inngest_step_id: "inngest-step-123",
        created_by_user_id: null,
        created_at: new Date(),
      },
      {
        id: "event-2",
        workflow_run_id: "run-123",
        event_type: "step_started",
        event_data: { title: "Step started", body: "" },
        phase: "test",
        inngest_step_id: "inngest-step-123",
        created_by_user_id: null,
        created_at: new Date(),
      },
    ];

    const merged = mergeLogsChronologically(step, events);

    expect(merged).toHaveLength(1);
    expect(merged[0].content).toBe("Log event");
  });

  it("handles step with no traces", () => {
    const step: WorkflowRunStep = {
      id: "step-123",
      workflow_run_id: "run-123",
      inngest_step_id: "inngest-step-123",
      name: "Test Step",
      phase: "test",
      status: "completed",
      output: null,
      log_directory_path: null,
      agent_session_id: null,
      error_message: null,
      started_at: new Date(),
      completed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const events: WorkflowEvent[] = [
      {
        id: "event-1",
        workflow_run_id: "run-123",
        event_type: "step_log",
        event_data: { level: "info", message: "Only events", args: [] },
        phase: "test",
        inngest_step_id: "inngest-step-123",
        created_by_user_id: null,
        created_at: new Date(),
      },
    ];

    const merged = mergeLogsChronologically(step, events);

    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("event");
  });

  it("handles step with no events", () => {
    const step: WorkflowRunStep = {
      id: "step-123",
      workflow_run_id: "run-123",
      inngest_step_id: "inngest-step-123",
      name: "Test Step",
      phase: "test",
      status: "completed",
      output: {
        trace: [{ command: "echo test", output: "test" }],
      },
      log_directory_path: null,
      agent_session_id: null,
      error_message: null,
      started_at: new Date(),
      completed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const merged = mergeLogsChronologically(step, []);

    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("trace");
  });

  it("returns empty array when step has no logs", () => {
    const step: WorkflowRunStep = {
      id: "step-123",
      workflow_run_id: "run-123",
      inngest_step_id: "inngest-step-123",
      name: "Test Step",
      phase: "test",
      status: "completed",
      output: null,
      log_directory_path: null,
      agent_session_id: null,
      error_message: null,
      started_at: new Date(),
      completed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const merged = mergeLogsChronologically(step, []);

    expect(merged).toHaveLength(0);
  });

  it("sorts by timestamp ascending", () => {
    const step: WorkflowRunStep = {
      id: "step-123",
      workflow_run_id: "run-123",
      inngest_step_id: "inngest-step-123",
      name: "Test Step",
      phase: "test",
      status: "completed",
      output: {
        trace: [{ command: "cmd1", output: "out1" }],
      },
      log_directory_path: null,
      agent_session_id: null,
      error_message: null,
      started_at: new Date("2025-01-15T10:00:00.000Z"),
      completed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const events: WorkflowEvent[] = [
      {
        id: "event-3",
        workflow_run_id: "run-123",
        event_type: "step_log",
        event_data: { level: "info", message: "Third", args: [] },
        phase: "test",
        inngest_step_id: "inngest-step-123",
        created_by_user_id: null,
        created_at: new Date("2025-01-15T10:00:00.200Z"),
      },
      {
        id: "event-2",
        workflow_run_id: "run-123",
        event_type: "step_log",
        event_data: { level: "info", message: "Second", args: [] },
        phase: "test",
        inngest_step_id: "inngest-step-123",
        created_by_user_id: null,
        created_at: new Date("2025-01-15T10:00:00.050Z"),
      },
    ];

    const merged = mergeLogsChronologically(step, events);

    expect(merged).toHaveLength(3);
    expect(merged[0].timestamp.getTime()).toBe(
      new Date("2025-01-15T10:00:00.000Z").getTime()
    );
    expect(merged[1].timestamp.getTime()).toBe(
      new Date("2025-01-15T10:00:00.050Z").getTime()
    );
    expect(merged[2].timestamp.getTime()).toBe(
      new Date("2025-01-15T10:00:00.200Z").getTime()
    );
  });
});
