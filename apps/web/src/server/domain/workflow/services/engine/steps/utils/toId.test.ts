import { describe, it, expect } from "vitest";
import { toId } from "./toId";

describe("toId", () => {
  describe("sentence case conversion", () => {
    it("converts sentence case to slug", () => {
      expect(toId("Analyze Requirements")).toBe("analyze-requirements");
    });

    it("handles multi-word phrases", () => {
      expect(toId("Process Data 2024")).toBe("process-data-2024");
    });

    it("handles mixed case", () => {
      expect(toId("CreateCommit")).toBe("createcommit");
    });
  });

  describe("kebab-case passthrough", () => {
    it("leaves kebab-case unchanged", () => {
      expect(toId("analyze-requirements")).toBe("analyze-requirements");
    });

    it("leaves single word unchanged", () => {
      expect(toId("analyze")).toBe("analyze");
    });

    it("preserves numbers in kebab-case", () => {
      expect(toId("process-data-2024")).toBe("process-data-2024");
    });
  });

  describe("special characters", () => {
    it("strips non-ASCII characters", () => {
      expect(toId("Très bien")).toBe("trs-bien");
    });

    it("removes punctuation", () => {
      expect(toId("Process Data (2024)")).toBe("process-data-2024");
    });

    it("handles exclamation marks", () => {
      expect(toId("Très  Long__Annotation!!!")).toBe("trs-long-annotation");
    });

    it("removes parentheses", () => {
      expect(toId("Step (with notes)")).toBe("step-with-notes");
    });
  });

  describe("whitespace handling", () => {
    it("collapses multiple spaces", () => {
      expect(toId("Too   Many   Spaces")).toBe("too-many-spaces");
    });

    it("replaces underscores with hyphens", () => {
      expect(toId("snake_case_name")).toBe("snake-case-name");
    });

    it("collapses multiple hyphens", () => {
      expect(toId("Too---Many---Hyphens")).toBe("too-many-hyphens");
    });

    it("removes leading/trailing spaces", () => {
      expect(toId("  Trim Me  ")).toBe("trim-me");
    });

    it("removes leading/trailing hyphens", () => {
      expect(toId("---leading-and-trailing---")).toBe(
        "leading-and-trailing",
      );
    });
  });

  describe("truncation", () => {
    it("truncates to 64 characters", () => {
      const longString = "A".repeat(100);
      expect(toId(longString)).toHaveLength(64);
      expect(toId(longString)).toBe("a".repeat(64));
    });

    it("truncates long sentence", () => {
      const longSentence =
        "This is an extremely long annotation that describes what the step does in great detail and exceeds the maximum allowed length";
      const result = toId(longSentence);
      expect(result.length).toBeLessThanOrEqual(64);
    });

    it("does not truncate strings under 64 chars", () => {
      const shortString = "short-string";
      expect(toId(shortString)).toBe(shortString);
    });
  });

  describe("number preservation", () => {
    it("preserves numbers", () => {
      expect(toId("Process Data 2024")).toBe("process-data-2024");
    });

    it("preserves version numbers", () => {
      expect(toId("v2 Migration")).toBe("v2-migration");
    });

    it("handles numbers at start", () => {
      expect(toId("2024 Report")).toBe("2024-report");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(toId("")).toBe("");
    });

    it("handles only spaces", () => {
      expect(toId("   ")).toBe("");
    });

    it("handles only special characters", () => {
      expect(toId("!!!")).toBe("");
    });

    it("handles only hyphens", () => {
      expect(toId("---")).toBe("");
    });

    it("handles single character", () => {
      expect(toId("A")).toBe("a");
    });

    it("handles numbers only", () => {
      expect(toId("2024")).toBe("2024");
    });
  });
});
