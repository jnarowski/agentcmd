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
  spec_file?: string; // Path relative to .agent/specs/ (e.g., "todo/251117.../spec.md")
  spec_content?: string;
  spec_type?: string;
  planning_session_id?: string;
  mode?: string;
  base_branch?: string;
  branch_name?: string;
  inngest_run_id?: string;
}

// Workflow execution filters for querying
export interface WorkflowRunFilters {
  project_id?: string;
  user_id?: string;
  status?: WorkflowStatus | WorkflowStatus[];
  search?: string;
  definition_id?: string;
}
