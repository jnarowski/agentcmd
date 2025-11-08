/**
 * Build Inngest function ID and event name for workflow
 *
 * Returns unique identifiers scoped per project-workflow or global workflow:
 * - functionId: Used for Inngest function registration (must be globally unique)
 * - eventName: Used for event triggering (Inngest dot-notation convention)
 *
 * @param workflowId - Workflow identifier from config
 * @param projectId - Optional project ID (null for global workflows)
 * @returns Object with functionId and eventName
 *
 * @example
 * // Project workflow
 * const { functionId, eventName } = buildWorkflowIdentifiers('deploy-app', 'proj-abc');
 * // functionId: "proj-abc.workflow.deploy-app"
 * // eventName: "workflow.proj-abc.deploy-app.triggered"
 *
 * @example
 * // Global workflow
 * const { functionId, eventName } = buildWorkflowIdentifiers('pr-review');
 * // functionId: "global.workflow.pr-review"
 * // eventName: "workflow.global.pr-review.triggered"
 */
export function buildWorkflowIdentifiers(
  workflowId: string,
  projectId?: string | null
): {
  functionId: string;
  eventName: string;
} {
  const scope = projectId || 'global';
  return {
    functionId: `${scope}.workflow.${workflowId}`,
    eventName: `workflow.${scope}.${workflowId}.triggered`,
  };
}
