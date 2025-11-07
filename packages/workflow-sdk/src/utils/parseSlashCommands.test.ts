import { describe, it, expect } from "vitest";
import { parseArgumentHint, parseJsonResponseSchema } from "./parseSlashCommands";

describe("parseArgumentHint", () => {
  it("should parse array format with required arguments", () => {
    const result = parseArgumentHint(["feature-name", "context"]);
    expect(result).toEqual([
      { name: "feature-name", required: true },
      { name: "context", required: true },
    ]);
  });

  it("should parse array format with optional arguments (? suffix)", () => {
    const result = parseArgumentHint(["feature-name?", "context?"]);
    expect(result).toEqual([
      { name: "feature-name", required: false },
      { name: "context", required: false },
    ]);
  });

  it("should parse array format with optional arguments (wrapped in parens)", () => {
    const result = parseArgumentHint(["(feature-name)", "(context)"]);
    expect(result).toEqual([
      { name: "feature-name", required: false },
      { name: "context", required: false },
    ]);
  });

  it("should parse array format with mixed required and optional", () => {
    const result = parseArgumentHint(["spec-name-or-path", "format?"]);
    expect(result).toEqual([
      { name: "spec-name-or-path", required: true },
      { name: "format", required: false },
    ]);
  });

  it("should parse string format with brackets", () => {
    const result = parseArgumentHint("[feature-name, context]");
    expect(result).toEqual([
      { name: "feature-name", required: true },
      { name: "context", required: true },
    ]);
  });

  it("should parse string format with optional markers", () => {
    const result = parseArgumentHint("[feature-name, context?]");
    expect(result).toEqual([
      { name: "feature-name", required: true },
      { name: "context", required: false },
    ]);
  });

  it("should handle empty array", () => {
    const result = parseArgumentHint([]);
    expect(result).toEqual([]);
  });

  it("should handle empty string", () => {
    const result = parseArgumentHint("[]");
    expect(result).toEqual([]);
  });

  it("should handle undefined", () => {
    const result = parseArgumentHint(undefined);
    expect(result).toEqual([]);
  });

  it("should handle null", () => {
    const result = parseArgumentHint(null);
    expect(result).toEqual([]);
  });

  it("should handle non-string/non-array values", () => {
    const result = parseArgumentHint(123);
    expect(result).toEqual([]);
  });

  it("should trim whitespace from argument names", () => {
    const result = parseArgumentHint(["  feature-name  ", "  context  "]);
    expect(result).toEqual([
      { name: "feature-name", required: true },
      { name: "context", required: true },
    ]);
  });
});

describe("parseJsonResponseSchema", () => {
  it("should parse JSON example and field descriptions", () => {
    const markdown = `
If $format is "json", return ONLY this JSON:

\`\`\`json
{
  "success": true,
  "count": 42
}
\`\`\`

**JSON Field Descriptions:**
- \`success\`: Operation status
- \`count\`: Number of items
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema).toBeDefined();
    expect(schema?.exampleJson.success).toBe(true);
    expect(schema?.exampleJson.count).toBe(42);
    expect(schema?.fieldDescriptions.get("success")).toBe("Operation status");
    expect(schema?.fieldDescriptions.get("count")).toBe("Number of items");
  });

  it("should return undefined when no JSON schema present", () => {
    const markdown = "Just regular documentation";
    expect(parseJsonResponseSchema(markdown)).toBeUndefined();
  });

  it("should handle nested objects", () => {
    const markdown = `
If $format is "json", return ONLY this JSON:

\`\`\`json
{
  "data": {
    "nested": "value"
  }
}
\`\`\`
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema?.exampleJson.data).toEqual({ nested: "value" });
  });

  it("should handle pattern with parenthetical text", () => {
    const markdown = `
If $format is "json", return ONLY this JSON (no other text):

\`\`\`json
{
  "success": true
}
\`\`\`
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema).toBeDefined();
    expect(schema?.exampleJson.success).toBe(true);
  });

  it("should work without field descriptions", () => {
    const markdown = `
If $format is "json", return ONLY this JSON:

\`\`\`json
{
  "result": "ok"
}
\`\`\`
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema).toBeDefined();
    expect(schema?.exampleJson.result).toBe("ok");
    expect(schema?.fieldDescriptions.size).toBe(0);
  });

  it("should handle arrays in JSON", () => {
    const markdown = `
If $format is "json", return ONLY this JSON:

\`\`\`json
{
  "items": [1, 2, 3]
}
\`\`\`
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema?.exampleJson.items).toEqual([1, 2, 3]);
  });

  it("should return undefined for invalid JSON", () => {
    const markdown = `
If $format is "json", return ONLY this JSON:

\`\`\`json
{ invalid json }
\`\`\`
    `;

    const schema = parseJsonResponseSchema(markdown);
    expect(schema).toBeUndefined();
  });
});
