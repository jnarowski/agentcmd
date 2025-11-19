import type { ConditionRule } from "../types/webhook.types";

// PUBLIC API

/**
 * Evaluates an array of condition rules with AND logic
 * All conditions must pass for the result to be true
 *
 * @param conditions - Array of condition rules to evaluate
 * @param payload - Source data object
 * @returns true if all conditions pass, false otherwise
 *
 * @example
 * ```typescript
 * const conditions = [
 *   { path: "action", operator: "equals", value: "opened" },
 *   { path: "pull_request.state", operator: "equals", value: "open" }
 * ];
 * const payload = {
 *   action: "opened",
 *   pull_request: { state: "open" }
 * };
 * const result = evaluateConditions(conditions, payload);
 * // => true
 * ```
 */
export function evaluateConditions(
  conditions: ConditionRule[],
  payload: Record<string, unknown>,
): boolean {
  // All conditions must pass (AND logic)
  return conditions.every((condition) =>
    evaluateCondition(condition, payload),
  );
}

// PRIVATE HELPERS

/**
 * Evaluates a single condition rule
 */
function evaluateCondition(
  condition: ConditionRule,
  payload: Record<string, unknown>,
): boolean {
  const actualValue = resolvePath(payload, condition.path);
  const expectedValue = condition.value;

  switch (condition.operator) {
    case "equals":
      // Loose equality with type coercion
      return actualValue == expectedValue;

    case "not_equals":
      return actualValue != expectedValue;

    case "contains":
      return evaluateContains(actualValue, expectedValue);

    case "not_contains":
      return !evaluateContains(actualValue, expectedValue);

    case "greater_than":
      return (
        typeof actualValue === "number" &&
        typeof expectedValue === "number" &&
        actualValue > expectedValue
      );

    case "less_than":
      return (
        typeof actualValue === "number" &&
        typeof expectedValue === "number" &&
        actualValue < expectedValue
      );

    case "exists":
      return actualValue !== undefined && actualValue !== null;

    case "not_exists":
      return actualValue === undefined || actualValue === null;

    default:
      return false;
  }
}

/**
 * Evaluates contains operator
 * For arrays of objects, checks .name or .id properties
 * For arrays of primitives, checks direct inclusion
 * For strings, checks substring
 */
function evaluateContains(actualValue: unknown, expectedValue: unknown): boolean {
  if (typeof actualValue === "string" && typeof expectedValue === "string") {
    return actualValue.includes(expectedValue);
  }

  if (Array.isArray(actualValue)) {
    // Array of objects: check .name or .id properties
    if (actualValue.some((item) => typeof item === "object" && item !== null)) {
      return actualValue.some(
        (item) =>
          (typeof item === "object" &&
            item !== null &&
            "name" in item &&
            item.name === expectedValue) ||
          (typeof item === "object" &&
            item !== null &&
            "id" in item &&
            item.id === expectedValue),
      );
    }
    // Array of primitives: direct inclusion
    return actualValue.includes(expectedValue);
  }

  return false;
}

/**
 * Resolves a dot notation path to a value in an object
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}
