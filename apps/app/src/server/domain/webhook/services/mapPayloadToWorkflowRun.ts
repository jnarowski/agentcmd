import type { FieldMapping } from "../types/webhook.types";
import { WORKFLOW_RUN_TABLE_FIELDS } from "../constants/webhook.constants";
import { resolveMapping } from "./resolveMapping";

// PUBLIC API

/**
 * Maps webhook payload to WorkflowRun creation data
 * Separates table fields from custom args using WORKFLOW_RUN_TABLE_FIELDS
 *
 * @param payload - Webhook payload
 * @param mappings - Field mapping configurations
 * @param workflowIdentifier - Workflow identifier for the run
 * @param projectId - Project ID
 * @param userId - User ID
 * @returns WorkflowRun creation data with table fields and args
 *
 * @example
 * ```typescript
 * const payload = { pull_request: { number: 42, title: "Fix bug" } };
 * const mappings = [
 *   { type: "input", field: "name", value: "PR #{{pull_request.number}}" },
 *   { type: "input", field: "description", value: "{{pull_request.title}}" }
 * ];
 * const result = mapPayloadToWorkflowRun(payload, mappings, "pr-workflow", "proj_123", "user_123");
 * // => {
 * //   name: "PR #42",
 * //   args: { description: "Fix bug" },
 * //   ...
 * // }
 * ```
 */
export function mapPayloadToWorkflowRun(
  payload: Record<string, unknown>,
  mappings: FieldMapping[],
  workflowIdentifier: string,
  projectId: string,
  userId: string,
): MappedWorkflowRunData {
  const tableFields: Record<string, unknown> = {};
  const args: Record<string, unknown> = {};

  // Resolve all mappings
  for (const mapping of mappings) {
    const value = resolveMapping(mapping, payload);

    if (value !== undefined) {
      // Check if this is a table field
      if (isTableField(mapping.field)) {
        tableFields[mapping.field] = value;
      } else {
        // Custom arg
        args[mapping.field] = value;
      }
    }
  }

  return {
    project_id: projectId,
    user_id: userId,
    workflow_identifier: workflowIdentifier,
    table_fields: tableFields,
    args,
  };
}

// PRIVATE HELPERS

/**
 * Checks if a field name is a WorkflowRun table field
 */
function isTableField(field: string): boolean {
  return (WORKFLOW_RUN_TABLE_FIELDS as readonly string[]).includes(field);
}

/**
 * Mapped workflow run data
 */
export interface MappedWorkflowRunData {
  project_id: string;
  user_id: string;
  workflow_identifier: string;
  table_fields: Record<string, unknown>;
  args: Record<string, unknown>;
}
