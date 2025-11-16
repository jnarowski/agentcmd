import { describe, it, expect } from "vitest";
import { sanitizeJson } from "./sanitizeJson";

describe("sanitizeJson", () => {
  it("redacts sensitive keys", () => {
    const data = {
      apiKey: "secret-key-123",
      token: "secret-token",
      password: "secret-password",
      api_key: "another-secret",
      foo: "bar",
    };

    const result = sanitizeJson(data) as Record<string, unknown>;

    expect(result.apiKey).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
    expect(result.api_key).toBe("[REDACTED]");
    expect(result.foo).toBe("bar");
  });

  it("handles circular references", () => {
    const circular: Record<string, unknown> = { foo: "bar" };
    circular.self = circular;

    const result = sanitizeJson(circular) as Record<string, unknown>;

    expect(result.foo).toBe("bar");
    expect(result.self).toBe("[Circular]");
  });

  it("truncates long strings", () => {
    const longString = "a".repeat(15000);
    const data = { text: longString };

    const result = sanitizeJson(data) as Record<string, unknown>;

    expect((result.text as string).length).toBeLessThan(longString.length);
    expect(result.text).toContain("[truncated]");
  });

  it("handles Error objects", () => {
    const error = new Error("Test error");
    const result = sanitizeJson(error) as Record<string, unknown>;

    expect(result.name).toBe("Error");
    expect(result.message).toBe("Test error");
    expect(result.stack).toBeDefined();
  });

  it("converts Date to ISO string", () => {
    const date = new Date("2025-01-15T10:00:00Z");
    const result = sanitizeJson({ date });

    expect(result).toEqual({ date: "2025-01-15T10:00:00.000Z" });
  });

  it("strips functions", () => {
    const data = {
      fn: () => "test",
      value: "keep",
    };

    const result = sanitizeJson(data) as Record<string, unknown>;

    expect(result.fn).toBeNull();
    expect(result.value).toBe("keep");
  });

  it("handles nested objects", () => {
    const data = {
      outer: {
        inner: {
          apiKey: "secret",
          value: "keep",
        },
      },
    };

    const result = sanitizeJson(data) as Record<string, unknown>;
    const outer = result.outer as Record<string, unknown>;
    const inner = outer.inner as Record<string, unknown>;

    expect(inner.apiKey).toBe("[REDACTED]");
    expect(inner.value).toBe("keep");
  });

  it("handles arrays", () => {
    const data = [
      { apiKey: "secret1", value: 1 },
      { token: "secret2", value: 2 },
    ];

    const result = sanitizeJson(data) as Array<Record<string, unknown>>;

    expect(result[0].apiKey).toBe("[REDACTED]");
    expect(result[0].value).toBe(1);
    expect(result[1].token).toBe("[REDACTED]");
    expect(result[1].value).toBe(2);
  });

  it("handles special number values", () => {
    const data = {
      nan: NaN,
      infinity: Infinity,
      negInfinity: -Infinity,
      normal: 42,
    };

    const result = sanitizeJson(data) as Record<string, unknown>;

    expect(result.nan).toBeNull();
    expect(result.infinity).toBeNull();
    expect(result.negInfinity).toBeNull();
    expect(result.normal).toBe(42);
  });

  it("converts BigInt to string", () => {
    const data = { bigNum: BigInt(12345678901234567890n) };

    const result = sanitizeJson(data) as Record<string, unknown>;

    expect(result.bigNum).toBe("12345678901234567890");
  });

  it("handles null and undefined", () => {
    const data = {
      nullValue: null,
      undefinedValue: undefined,
      value: "keep",
    };

    const result = sanitizeJson(data) as Record<string, unknown>;

    expect(result.nullValue).toBeNull();
    expect(result.undefinedValue).toBeNull();
    expect(result.value).toBe("keep");
  });
});
