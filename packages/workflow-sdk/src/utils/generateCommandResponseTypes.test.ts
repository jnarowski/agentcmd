import { describe, it, expect } from "vitest";
import {
  commandNameToTypeName,
  generateResponseTypeCode,
} from "./generateCommandResponseTypes";
import type { ResponseSchema } from "../types/slash-commands-internal";

describe("commandNameToTypeName", () => {
  it("should convert slash command to PascalCase with Result suffix", () => {
    expect(commandNameToTypeName("/review-spec-implementation")).toBe(
      "ReviewSpecImplementationResult"
    );
  });

  it("should handle single-word commands", () => {
    expect(commandNameToTypeName("/test")).toBe("TestResult");
  });

  it("should handle commands without leading slash", () => {
    expect(commandNameToTypeName("generate-prd")).toBe("GeneratePrdResult");
  });

  it("should handle multi-word commands", () => {
    expect(commandNameToTypeName("/generate-feature-spec")).toBe(
      "GenerateFeatureSpecResult"
    );
  });
});

describe("generateResponseTypeCode", () => {
  it("should generate interface with correct naming", () => {
    const schema: ResponseSchema = {
      exampleJson: { success: true },
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/review-spec", schema);
    expect(code).toContain("export interface ReviewSpecResult");
    expect(code).toContain("success: boolean;");
  });

  it("should include JSDoc comments for documented fields", () => {
    const schema: ResponseSchema = {
      exampleJson: { success: true, count: 42 },
      fieldDescriptions: new Map([
        ["success", "Operation status"],
        ["count", "Number of items"],
      ]),
    };

    const code = generateResponseTypeCode("/test-command", schema);
    expect(code).toContain("/** Operation status */");
    expect(code).toContain("success: boolean;");
    expect(code).toContain("/** Number of items */");
    expect(code).toContain("count: number;");
  });

  it("should handle nested objects correctly", () => {
    const schema: ResponseSchema = {
      exampleJson: {
        data: {
          nested: 1,
          value: "test",
        },
      },
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/test", schema);
    expect(code).toContain("data: {");
    expect(code).toContain("nested: number;");
    expect(code).toContain("value: string;");
    expect(code).toContain("};");
  });

  it("should handle arrays", () => {
    const schema: ResponseSchema = {
      exampleJson: {
        items: [1, 2, 3],
        tags: ["a", "b"],
      },
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/test", schema);
    expect(code).toContain("items: number[];");
    expect(code).toContain("tags: string[];");
  });

  it("should handle all primitive types", () => {
    const schema: ResponseSchema = {
      exampleJson: {
        flag: true,
        count: 42,
        name: "test",
        value: null,
      },
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/test", schema);
    expect(code).toContain("flag: boolean;");
    expect(code).toContain("count: number;");
    expect(code).toContain("name: string;");
    expect(code).toContain("value: null;");
  });

  it("should include command documentation comment", () => {
    const schema: ResponseSchema = {
      exampleJson: { success: true },
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/review-spec", schema);
    expect(code).toContain("/**");
    expect(code).toContain("* Response type for /review-spec command");
    expect(code).toContain("*/");
  });

  it("should handle empty object", () => {
    const schema: ResponseSchema = {
      exampleJson: {},
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/test", schema);
    expect(code).toContain("export interface TestResult {");
    expect(code).toContain("}");
  });

  it("should handle deeply nested objects", () => {
    const schema: ResponseSchema = {
      exampleJson: {
        level1: {
          level2: {
            value: "deep",
          },
        },
      },
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/test", schema);
    expect(code).toContain("level1: {");
    expect(code).toContain("level2: {");
    expect(code).toContain('value: string;');
  });

  it("should handle mixed JSDoc comments and non-commented fields", () => {
    const schema: ResponseSchema = {
      exampleJson: {
        documented: true,
        undocumented: 42,
      },
      fieldDescriptions: new Map([["documented", "This field has a description"]]),
    };

    const code = generateResponseTypeCode("/test", schema);
    expect(code).toContain("/** This field has a description */");
    expect(code).toContain("documented: boolean;");
    expect(code).not.toContain("/** */\n  undocumented"); // No JSDoc for undocumented field
    expect(code).toContain("undocumented: number;");
  });
});
