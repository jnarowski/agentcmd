import type { WorkflowDefinition } from "agentcmd-workflows";

/**
 * Check if an object is a workflow definition
 */
function isWorkflowDefinition(obj: unknown): obj is WorkflowDefinition {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "__type" in obj &&
    obj.__type === "workflow" &&
    "createInngestFunction" in obj &&
    typeof obj.createInngestFunction === "function"
  );
}

/**
 * Extract workflow definition from a module
 * Supports multiple export patterns:
 * - export default defineWorkflow(...)
 * - export const workflow = defineWorkflow(...)
 * - export const createWorkflow = defineWorkflow(...)
 *
 * @param module - Imported module
 * @returns WorkflowDefinition or null
 */
export function extractWorkflowDefinition(
  module: Record<string, unknown>
): WorkflowDefinition | null {
  // Check default export
  if (module.default && isWorkflowDefinition(module.default)) {
    return module.default;
  }

  // Check named exports
  for (const key of Object.keys(module)) {
    if (isWorkflowDefinition(module[key])) {
      return module[key];
    }
  }

  return null;
}
