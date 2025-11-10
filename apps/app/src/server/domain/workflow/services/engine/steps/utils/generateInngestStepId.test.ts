import { describe, it, expect } from "vitest";
import { generateInngestStepId } from "./generateInngestStepId";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

describe("generateInngestStepId", () => {
  it("prefixes step ID with phase when phase exists", () => {
    const context = {
      currentPhase: "build",
    } as RuntimeContext;

    const result = generateInngestStepId(context, "compile");

    expect(result).toBe("build-compile");
  });

  it("returns step ID without prefix when no phase", () => {
    const context = {
      currentPhase: null,
    } as RuntimeContext;

    const result = generateInngestStepId(context, "compile");

    expect(result).toBe("compile");
  });

  it("returns step ID without prefix when phase is undefined", () => {
    const context = {} as RuntimeContext;

    const result = generateInngestStepId(context, "compile");

    expect(result).toBe("compile");
  });
});
