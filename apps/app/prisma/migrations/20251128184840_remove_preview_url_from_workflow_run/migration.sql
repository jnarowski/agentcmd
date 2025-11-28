-- AlterTable: Remove preview_url column from workflow_runs
-- Container URLs are now accessed via the container relation

-- Create new table without preview_url
CREATE TABLE "new_workflow_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "args" TEXT NOT NULL,
    "spec_file" TEXT,
    "spec_content" TEXT,
    "spec_type" TEXT,
    "planning_session_id" TEXT,
    "mode" TEXT,
    "branch_name" TEXT,
    "base_branch" TEXT,
    "worktree_name" TEXT,
    "preserve" BOOLEAN DEFAULT false,
    "pr_url" TEXT,
    "triggered_by" TEXT NOT NULL DEFAULT 'manual',
    "webhook_event_id" TEXT,
    "issue_id" TEXT,
    "issue_url" TEXT,
    "issue_source" TEXT,
    "current_phase" TEXT,
    "current_step_index" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "inngest_run_id" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "paused_at" DATETIME,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_runs_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_runs_planning_session_id_fkey" FOREIGN KEY ("planning_session_id") REFERENCES "agent_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "workflow_runs_webhook_event_id_fkey" FOREIGN KEY ("webhook_event_id") REFERENCES "webhook_events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data (excluding preview_url)
INSERT INTO "new_workflow_runs" ("id", "project_id", "user_id", "workflow_definition_id", "name", "args", "spec_file", "spec_content", "spec_type", "planning_session_id", "mode", "branch_name", "base_branch", "worktree_name", "preserve", "pr_url", "triggered_by", "webhook_event_id", "issue_id", "issue_url", "issue_source", "current_phase", "current_step_index", "status", "error_message", "inngest_run_id", "started_at", "completed_at", "paused_at", "cancelled_at", "created_at", "updated_at")
SELECT "id", "project_id", "user_id", "workflow_definition_id", "name", "args", "spec_file", "spec_content", "spec_type", "planning_session_id", "mode", "branch_name", "base_branch", "worktree_name", "preserve", "pr_url", "triggered_by", "webhook_event_id", "issue_id", "issue_url", "issue_source", "current_phase", "current_step_index", "status", "error_message", "inngest_run_id", "started_at", "completed_at", "paused_at", "cancelled_at", "created_at", "updated_at" FROM "workflow_runs";

-- Drop old table
DROP TABLE "workflow_runs";

-- Rename new table
ALTER TABLE "new_workflow_runs" RENAME TO "workflow_runs";

-- Recreate indexes
CREATE INDEX "workflow_runs_project_id_status_idx" ON "workflow_runs"("project_id", "status");
CREATE INDEX "workflow_runs_user_id_status_idx" ON "workflow_runs"("user_id", "status");
CREATE INDEX "workflow_runs_workflow_definition_id_idx" ON "workflow_runs"("workflow_definition_id");
CREATE INDEX "workflow_runs_planning_session_id_idx" ON "workflow_runs"("planning_session_id");
CREATE INDEX "workflow_runs_webhook_event_id_idx" ON "workflow_runs"("webhook_event_id");
CREATE INDEX "workflow_runs_triggered_by_idx" ON "workflow_runs"("triggered_by");
CREATE INDEX "workflow_runs_issue_source_idx" ON "workflow_runs"("issue_source");
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");
CREATE INDEX "workflow_runs_inngest_run_id_idx" ON "workflow_runs"("inngest_run_id");
