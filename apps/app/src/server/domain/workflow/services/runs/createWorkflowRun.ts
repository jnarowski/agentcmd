import { prisma } from '@/shared/prisma';
import type { CreateWorkflowRunInput } from '../../types';
import type { WorkflowRun } from '@prisma/client';

/**
 * Creates a new workflow run record
 * Sets initial state: status='pending', current_phase=first_phase, current_step_index=0
 * Returns null if workflow definition not found
 */
export async function createWorkflowRun(
  data: CreateWorkflowRunInput
): Promise<WorkflowRun | null> {
  // Get workflow definition to extract first phase
  const definition = await prisma.workflowDefinition.findUnique({
    where: { id: data.workflow_definition_id },
  });

  if (!definition) {
    return null;
  }

  // Extract first phase ID from phases JSON array
  const phases = definition.phases as Array<{ id: string; label: string }>;
  const firstPhaseId = phases.length > 0 ? phases[0].id : null;

  const run = await prisma.workflowRun.create({
    data: {
      project_id: data.project_id,
      user_id: data.user_id,
      workflow_definition_id: data.workflow_definition_id,
      name: data.name,
      // @ts-ignore - JSON value type
      args: data.args,
      spec_file: data.spec_file,
      spec_content: data.spec_content,
      spec_type: data.spec_type,
      planning_session_id: data.planning_session_id,
      mode: data.mode,
      base_branch: data.base_branch,
      branch_name: data.branch_name,
      triggered_by: data.triggered_by || 'manual',
      webhook_event_id: data.webhook_event_id,
      issue_id: data.issue_id,
      issue_url: data.issue_url,
      issue_source: data.issue_source,
      current_phase: firstPhaseId,
      current_step_index: 0,
      status: 'pending',
    },
    include: {
      workflow_definition: true,
      steps: true,
      events: true,
    },
  });

  return run;
}
