import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./getErrorMessage";

describe("getErrorMessage", () => {
  it("extracts message from Error object", () => {
    const error = new Error("Something went wrong");

    const result = getErrorMessage(error);

    expect(result).toBe("Something went wrong");
  });

  it("returns string as-is when error is string", () => {
    const error = "String error message";

    const result = getErrorMessage(error);

    expect(result).toBe("String error message");
  });

  it("converts unknown types to string", () => {
    const error = { code: 404, message: "Not found" };

    const result = getErrorMessage(error);

    expect(result).toBe("[object Object]");
  });
});
