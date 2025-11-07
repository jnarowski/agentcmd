import { describe, it, expect, vi, afterEach } from "vitest";
import { emitArtifactCreatedEvent } from "./emitArtifactCreatedEvent";
import type { WorkflowArtifact } from "@prisma/client";
import * as broadcastWorkflowEventModule from "../../../events/broadcastWorkflowEvent";

vi.mock("../../../events/broadcastWorkflowEvent", () => ({
  broadcastWorkflowEvent: vi.fn(),
}));

describe("emitArtifactCreatedEvent", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("emits workflow event with artifact data", () => {
    const mockBroadcastWorkflowEvent = vi.mocked(
      broadcastWorkflowEventModule.broadcastWorkflowEvent
    );

    const artifact: WorkflowArtifact = {
      id: "artifact-123",
      workflow_run_id: "run-456",
      workflow_run_step_id: null,
      workflow_event_id: null,
      name: "test-artifact.txt",
      file_path: ".agent/workflows/runs/run-456/artifacts/test.txt",
      file_type: "text",
      mime_type: "text/plain",
      size_bytes: 1024,
      phase: "build",
      inngest_step_id: null,
      created_at: new Date("2025-01-01T00:00:00Z"),
    };

    emitArtifactCreatedEvent("project-789", "run-456", artifact);

    expect(mockBroadcastWorkflowEvent).toHaveBeenCalledWith("project-789", {
      type: "workflow:run:artifact:created",
      data: {
        run_id: "run-456",
        artifact: {
          id: "artifact-123",
          workflow_run_id: "run-456",
          workflow_run_step_id: null,
          workflow_event_id: null,
          name: "test-artifact.txt",
          file_path: ".agent/workflows/runs/run-456/artifacts/test.txt",
          file_type: "text",
          mime_type: "text/plain",
          size_bytes: 1024,
          phase: "build",
          inngest_step_id: null,
          created_at: new Date("2025-01-01T00:00:00Z"),
        },
      },
    });
    expect(mockBroadcastWorkflowEvent).toHaveBeenCalledTimes(1);
  });
});
