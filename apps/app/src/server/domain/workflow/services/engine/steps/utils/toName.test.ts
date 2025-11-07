import { describe, it, expect } from "vitest";
import { toName } from "./toName";

describe("toName", () => {
  describe("sentence case passthrough", () => {
    it("leaves sentence case unchanged", () => {
      expect(toName("Analyze Requirements")).toBe("Analyze Requirements");
    });

    it("leaves multi-word phrases unchanged", () => {
      expect(toName("Process Data 2024")).toBe("Process Data 2024");
    });

    it("leaves mixed case with spaces unchanged", () => {
      expect(toName("Create New Commit")).toBe("Create New Commit");
    });
  });

  describe("kebab-case conversion", () => {
    it("converts kebab-case to title case", () => {
      expect(toName("analyze-requirements")).toBe("Analyze Requirements");
    });

    it("handles single word", () => {
      expect(toName("analyze")).toBe("Analyze");
    });

    it("preserves numbers", () => {
      expect(toName("process-data-2024")).toBe("Process Data 2024");
    });

    it("handles version numbers", () => {
      expect(toName("v2-migration")).toBe("V2 Migration");
    });

    it("handles multiple segments", () => {
      expect(toName("create-new-commit")).toBe("Create New Commit");
    });
  });

  describe("uppercase detection", () => {
    it("leaves PascalCase unchanged", () => {
      expect(toName("AnalyzeRequirements")).toBe("AnalyzeRequirements");
    });

    it("leaves camelCase unchanged", () => {
      expect(toName("analyzeRequirements")).toBe("analyzeRequirements");
    });

    it("leaves SCREAMING_CASE unchanged", () => {
      expect(toName("ANALYZE_REQUIREMENTS")).toBe("ANALYZE_REQUIREMENTS");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(toName("")).toBe("");
    });

    it("handles single character", () => {
      expect(toName("a")).toBe("A");
    });

    it("handles numbers only", () => {
      expect(toName("2024")).toBe("2024");
    });

    it("handles leading hyphen", () => {
      expect(toName("-leading")).toBe(" Leading");
    });

    it("handles trailing hyphen", () => {
      expect(toName("trailing-")).toBe("Trailing ");
    });

    it("handles multiple consecutive hyphens", () => {
      expect(toName("foo---bar")).toBe("Foo   Bar");
    });
  });

  describe("number preservation", () => {
    it("capitalizes segments with numbers", () => {
      expect(toName("v2-migration")).toBe("V2 Migration");
    });

    it("handles numbers at start", () => {
      expect(toName("2024-report")).toBe("2024 Report");
    });

    it("handles numbers in middle", () => {
      expect(toName("step-2-processing")).toBe("Step 2 Processing");
    });
  });
});
