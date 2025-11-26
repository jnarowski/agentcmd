// Comment types
export type CommentType = 'user' | 'system' | 'agent';

// Create comment input
export interface CreateCommentInput {
  workflow_run_id: string;
  workflow_run_step_id?: string; // Optional for workflow-level comments
  text: string;
  comment_type?: CommentType;
  created_by: string; // User ID
}
