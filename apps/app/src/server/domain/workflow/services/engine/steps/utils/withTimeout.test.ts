import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withTimeout } from "./withTimeout";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result when operation completes before timeout", async () => {
    const operation = Promise.resolve("success");

    const resultPromise = withTimeout(operation, 5000, "Test operation");
    const result = await resultPromise;

    expect(result).toBe("success");
  });

  it("throws error when operation exceeds timeout", async () => {
    const operation = new Promise((resolve) => {
      setTimeout(() => resolve("too late"), 10000);
    });

    const resultPromise = withTimeout(operation, 5000, "Test operation");

    // Advance timers past timeout
    vi.advanceTimersByTime(5001);

    await expect(resultPromise).rejects.toThrow(
      "Test operation timed out after 5000ms"
    );
  });
});
