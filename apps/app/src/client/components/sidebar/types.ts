export interface TaskItem {
  id: string;
  title: string;
  specPath: string;
  projectId: string;
  status: "pending";
}

export interface ActivityItem {
  id: string;
  type: "session" | "workflow";
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  updatedAt: string;
  projectId: string;
  workflowRunId?: string;
}

export type ActivityFilter = "all" | "sessions" | "workflows";
export type ProjectsView = "all" | "favorites" | "hidden";
