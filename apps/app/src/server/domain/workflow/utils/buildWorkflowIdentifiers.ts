/**
 * Build Inngest function ID and event name for workflow
 *
 * Returns unique identifiers scoped per project-workflow:
 * - functionId: Used for Inngest function registration (must be globally unique)
 * - eventName: Used for event triggering (Inngest dot-notation convention)
 *
 * @param projectId - Project ID
 * @param workflowId - Workflow identifier from config
 * @returns Object with functionId and eventName
 *
 * @example
 * const { functionId, eventName } = buildWorkflowIdentifiers('proj-abc', 'deploy-app');
 * // functionId: "proj-abc.workflow.deploy-app"
 * // eventName: "workflow.proj-abc.deploy-app.triggered"
 */
export function buildWorkflowIdentifiers(
  projectId: string,
  workflowId: string
): {
  functionId: string;
  eventName: string;
} {
  return {
    functionId: `${projectId}.workflow.${workflowId}`,
    eventName: `workflow.${projectId}.${workflowId}.triggered`,
  };
}
