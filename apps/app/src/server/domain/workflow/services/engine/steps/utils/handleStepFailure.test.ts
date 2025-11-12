import { describe, it, expect, vi, afterEach } from "vitest";
import { handleStepFailure } from "./handleStepFailure";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import * as updateStepStatusModule from "./updateStepStatus";

vi.mock("./updateStepStatus", () => ({
  updateStepStatus: vi.fn(),
}));

describe("handleStepFailure", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateStepStatus with failed status and error message", async () => {
    const mockUpdateStepStatus = vi.mocked(
      updateStepStatusModule.updateStepStatus
    );

    const context: RuntimeContext = {
      runId: "exec-123",
      projectId: "project-456",
      projectPath: "/tmp/test",
      userId: "user-789",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const error = new Error("Step execution failed");

    await handleStepFailure(context, "step-123", error);

    expect(mockUpdateStepStatus).toHaveBeenCalledWith(
      context,
      "step-123",
      "failed",
      undefined, // no args update
      expect.objectContaining({ // errorOutput
        error: "Step execution failed",
        name: "Error",
      }),
      "Step execution failed" // error message
    );
    expect(mockUpdateStepStatus).toHaveBeenCalledTimes(1);
  });
});
