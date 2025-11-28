export interface Container {
  id: string;
  workflow_run_id: string | null;
  project_id: string;
  status: "pending" | "starting" | "running" | "stopped" | "failed";
  ports: Record<string, number>;
  container_ids: string[] | null;
  compose_project: string | null;
  working_dir: string;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  stopped_at: string | null;
}
