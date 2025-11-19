import type { FieldMapping } from "../types/webhook.types";
import { evaluateConditions } from "./evaluateConditions";
import { renderTemplate } from "./renderTemplate";

// PUBLIC API

/**
 * Resolves a field mapping to a final value
 * Handles both input (template) and conditional (if/then) types
 *
 * @param mapping - Field mapping configuration
 * @param payload - Source data object
 * @returns Resolved value or undefined if no match
 *
 * @example
 * ```typescript
 * // Input type
 * const inputMapping = {
 *   type: "input",
 *   field: "title",
 *   value: "PR #{{pull_request.number}}"
 * };
 * const result = resolveMapping(inputMapping, payload);
 * // => "PR #42"
 *
 * // Conditional type
 * const conditionalMapping = {
 *   type: "conditional",
 *   field: "priority",
 *   conditionals: [
 *     { conditions: [{ path: "labels", operator: "contains", value: "urgent" }], value: "high" }
 *   ],
 *   default: "normal"
 * };
 * const result = resolveMapping(conditionalMapping, payload);
 * // => "high" (if labels contains urgent) or "normal" (default)
 * ```
 */
export function resolveMapping(
  mapping: FieldMapping,
  payload: Record<string, unknown>,
): string | undefined {
  if (mapping.type === "input") {
    return renderTemplate(mapping.value || "", payload);
  }

  if (mapping.type === "conditional") {
    // Evaluate conditionals in order, return first match
    if (mapping.conditionals) {
      for (const conditional of mapping.conditionals) {
        if (evaluateConditions(conditional.conditions, payload)) {
          // Conditional values can also contain templates
          return renderTemplate(conditional.value, payload);
        }
      }
    }
    // No conditions matched, use default
    return mapping.default ? renderTemplate(mapping.default, payload) : undefined;
  }

  return undefined;
}
