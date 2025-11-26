import { describe, it, expect } from "vitest";
import {
  commandNameToTypeName,
  generateResponseTypeCode,
} from "./generateCommandResponseTypes";
import type { ResponseSchema } from "../types/slash-commands-internal";

describe("commandNameToTypeName", () => {
  it("should convert namespaced slash command to PascalCase with Response suffix", () => {
    expect(commandNameToTypeName("/cmd:review-spec-implementation")).toBe(
      "CmdReviewSpecImplementationResponse"
    );
  });

  it("should handle nested namespaces", () => {
    expect(commandNameToTypeName("/cmd:spec:estimate")).toBe("CmdSpecEstimateResponse");
  });

  it("should handle single-level namespace", () => {
    expect(commandNameToTypeName("/cmd:test")).toBe("CmdTestResponse");
  });

  it("should handle commands without leading slash", () => {
    expect(commandNameToTypeName("cmd:generate-prd")).toBe("CmdGeneratePrdResponse");
  });

  it("should handle multi-word commands with namespace", () => {
    expect(commandNameToTypeName("/cmd:generate-feature-spec")).toBe(
      "CmdGenerateFeatureSpecResponse"
    );
  });

  it("should handle legacy non-namespaced commands", () => {
    expect(commandNameToTypeName("/generate-prd")).toBe("GeneratePrdResponse");
  });
});

describe("generateResponseTypeCode", () => {
  it("should generate interface with correct naming for namespaced commands", () => {
    const schema: ResponseSchema = {
      exampleJson: { success: true },
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/cmd:review-spec", schema);
    expect(code).toContain("export interface CmdReviewSpecResponse");
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

    const code = generateResponseTypeCode("/cmd:review-spec", schema);
    expect(code).toContain("/**");
    expect(code).toContain("* Response type for /cmd:review-spec command");
    expect(code).toContain("*/");
  });

  it("should handle empty object", () => {
    const schema: ResponseSchema = {
      exampleJson: {},
      fieldDescriptions: new Map(),
    };

    const code = generateResponseTypeCode("/test", schema);
    expect(code).toContain("export interface TestResponse {");
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
