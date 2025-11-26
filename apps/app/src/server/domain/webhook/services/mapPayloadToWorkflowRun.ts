import type {
  WebhookConfig,
  MappedDataDebugInfo,
  MatchedCondition,
  WebhookMappingFields,
} from "../types/webhook.types";
import { evaluateConditions } from "./evaluateConditions";

// PUBLIC API

/**
 * Maps webhook payload to workflow run fields using unified mappings array
 * Implements first-match-wins for conditional mode, always-match for simple mode
 *
 * @param payload - Webhook payload
 * @param config - Webhook configuration with unified mappings
 * @returns Mapping fields and debug info, or null if no match and default_action is "skip"
 *
 * @example
 * ```typescript
 * // Simple mode (always matches)
 * const config = {
 *   mappings: [{ spec_type_id: "bug", workflow_definition_id: "wf_123", conditions: [] }]
 * };
 * const result = mapPayloadToWorkflowRun(payload, config);
 * // => { mapping: { spec_type_id: "bug", workflow_definition_id: "wf_123" }, debugInfo: { ... } }
 *
 * // Conditional mode (first match wins)
 * const config = {
 *   mappings: [
 *     { spec_type_id: "bug", workflow_definition_id: "wf_1", conditions: [{ path: "type", operator: "equals", value: "bug" }] },
 *     { spec_type_id: "feature", workflow_definition_id: "wf_2", conditions: [{ path: "type", operator: "equals", value: "feature" }] }
 *   ],
 *   default_action: "set_fields",
 *   default_mapping: { spec_type_id: "other", workflow_definition_id: "wf_default" }
 * };
 * const result = mapPayloadToWorkflowRun({ type: "bug" }, config);
 * // => { mapping: { spec_type_id: "bug", workflow_definition_id: "wf_1" }, debugInfo: { ... } }
 * ```
 */
export function mapPayloadToWorkflowRun(
  payload: Record<string, unknown>,
  config: WebhookConfig,
): MappingResult | null {
  const mappingMode = config.mappings.length === 1 && config.mappings[0]!.conditions.length === 0
    ? "simple"
    : "conditional";

  // Try each mapping group (first match wins)
  for (const group of config.mappings) {
    // Empty conditions = always match (simple mode)
    if (group.conditions.length === 0) {
      const mapping: WebhookMappingFields = {
        spec_type_id: group.spec_type_id,
        workflow_definition_id: group.workflow_definition_id,
      };

      const debugInfo: MappedDataDebugInfo = {
        mapping_mode: "simple",
        mapping_conditions_matched: null,
        used_default: false,
        mapping,
      };

      return { mapping, debugInfo };
    }

    // Evaluate conditions (all must pass for AND logic)
    if (evaluateConditions(group.conditions, payload)) {
      const mapping: WebhookMappingFields = {
        spec_type_id: group.spec_type_id,
        workflow_definition_id: group.workflow_definition_id,
      };

      // Build matched conditions with payload values for debugging
      const matchedConditions: MatchedCondition[] = group.conditions.map((cond) => ({
        path: cond.path,
        operator: cond.operator,
        value: cond.value,
        payload_value: getValueByPath(payload, cond.path),
      }));

      const debugInfo: MappedDataDebugInfo = {
        mapping_mode: "conditional",
        mapping_conditions_matched: matchedConditions,
        used_default: false,
        mapping,
      };

      return { mapping, debugInfo };
    }
  }

  // No conditions matched - use default_action
  if (mappingMode === "conditional") {
    if (config.default_action === "skip") {
      return null; // Don't create workflow run
    }

    if (config.default_action === "set_fields" && config.default_mapping) {
      const debugInfo: MappedDataDebugInfo = {
        mapping_mode: "conditional",
        mapping_conditions_matched: null,
        used_default: true,
        mapping: config.default_mapping,
      };

      return { mapping: config.default_mapping, debugInfo };
    }
  }

  // Should never reach here if validation works correctly
  return null;
}

// PRIVATE HELPERS

/**
 * Gets value from payload by dot-notation path
 *
 * @example
 * getValueByPath({ pull_request: { number: 42 } }, "pull_request.number") // => 42
 */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Result of mapping resolution
 */
export interface MappingResult {
  mapping: WebhookMappingFields;
  debugInfo: MappedDataDebugInfo;
}
