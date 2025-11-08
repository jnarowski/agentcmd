// Workflow execution status
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Workflow step status
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// Workflow execution input for creation
export interface CreateWorkflowRunInput {
  project_id: string;
  user_id: string;
  workflow_definition_id: string;
  name: string;
  args: Record<string, unknown>;
  spec_file?: string;
  spec_content?: string;
  base_branch?: string;
  branch_name?: string;
  worktree_name?: string;
  inngest_run_id?: string;
}

// Workflow execution filters for querying
export interface WorkflowRunFilters {
  project_id?: string;
  user_id?: string;
  status?: WorkflowStatus;
}
