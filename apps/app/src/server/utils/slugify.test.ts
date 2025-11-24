import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  describe("sentence case conversion", () => {
    it("converts sentence case to slug", () => {
      expect(slugify("Analyze Requirements")).toBe("analyze-requirements");
    });

    it("handles multi-word phrases", () => {
      expect(slugify("Process Data 2024")).toBe("process-data-2024");
    });

    it("handles mixed case", () => {
      expect(slugify("CreateCommit")).toBe("createcommit");
    });
  });

  describe("kebab-case passthrough", () => {
    it("leaves kebab-case unchanged", () => {
      expect(slugify("analyze-requirements")).toBe("analyze-requirements");
    });

    it("leaves single word unchanged", () => {
      expect(slugify("analyze")).toBe("analyze");
    });

    it("preserves numbers in kebab-case", () => {
      expect(slugify("process-data-2024")).toBe("process-data-2024");
    });
  });

  describe("special characters", () => {
    it("strips non-ASCII characters", () => {
      expect(slugify("Très bien")).toBe("trs-bien");
    });

    it("removes punctuation", () => {
      expect(slugify("Process Data (2024)")).toBe("process-data-2024");
    });

    it("handles exclamation marks", () => {
      expect(slugify("Très  Long__Annotation!!!")).toBe("trs-long-annotation");
    });

    it("removes parentheses", () => {
      expect(slugify("Step (with notes)")).toBe("step-with-notes");
    });
  });

  describe("whitespace handling", () => {
    it("collapses multiple spaces", () => {
      expect(slugify("Too   Many   Spaces")).toBe("too-many-spaces");
    });

    it("replaces underscores with hyphens", () => {
      expect(slugify("snake_case_name")).toBe("snake-case-name");
    });

    it("collapses multiple hyphens", () => {
      expect(slugify("Too---Many---Hyphens")).toBe("too-many-hyphens");
    });

    it("removes leading/trailing spaces", () => {
      expect(slugify("  Trim Me  ")).toBe("trim-me");
    });

    it("removes leading/trailing hyphens", () => {
      expect(slugify("---leading-and-trailing---")).toBe(
        "leading-and-trailing",
      );
    });
  });

  describe("truncation", () => {
    it("truncates to 64 characters", () => {
      const longString = "A".repeat(100);
      expect(slugify(longString)).toHaveLength(64);
      expect(slugify(longString)).toBe("a".repeat(64));
    });

    it("truncates long sentence", () => {
      const longSentence =
        "This is an extremely long annotation that describes what the step does in great detail and exceeds the maximum allowed length";
      const result = slugify(longSentence);
      expect(result.length).toBeLessThanOrEqual(64);
    });

    it("does not truncate strings under 64 chars", () => {
      const shortString = "short-string";
      expect(slugify(shortString)).toBe(shortString);
    });
  });

  describe("number preservation", () => {
    it("preserves numbers", () => {
      expect(slugify("Process Data 2024")).toBe("process-data-2024");
    });

    it("preserves version numbers", () => {
      expect(slugify("v2 Migration")).toBe("v2-migration");
    });

    it("handles numbers at start", () => {
      expect(slugify("2024 Report")).toBe("2024-report");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(slugify("")).toBe("");
    });

    it("handles only spaces", () => {
      expect(slugify("   ")).toBe("");
    });

    it("handles only special characters", () => {
      expect(slugify("!!!")).toBe("");
    });

    it("handles only hyphens", () => {
      expect(slugify("---")).toBe("");
    });

    it("handles single character", () => {
      expect(slugify("A")).toBe("a");
    });

    it("handles numbers only", () => {
      expect(slugify("2024")).toBe("2024");
    });
  });
});
