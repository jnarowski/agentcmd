/*
  Warnings:

  - You are about to alter the column `args` on the `workflow_runs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_workflow_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "args" JSONB NOT NULL,
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
INSERT INTO "new_workflow_runs" ("args", "base_branch", "branch_name", "cancelled_at", "completed_at", "created_at", "current_phase", "current_step_index", "error_message", "id", "inngest_run_id", "issue_id", "issue_source", "issue_url", "mode", "name", "paused_at", "planning_session_id", "pr_url", "preserve", "project_id", "spec_content", "spec_file", "spec_type", "started_at", "status", "triggered_by", "updated_at", "user_id", "webhook_event_id", "workflow_definition_id", "worktree_name") SELECT "args", "base_branch", "branch_name", "cancelled_at", "completed_at", "created_at", "current_phase", "current_step_index", "error_message", "id", "inngest_run_id", "issue_id", "issue_source", "issue_url", "mode", "name", "paused_at", "planning_session_id", "pr_url", "preserve", "project_id", "spec_content", "spec_file", "spec_type", "started_at", "status", "triggered_by", "updated_at", "user_id", "webhook_event_id", "workflow_definition_id", "worktree_name" FROM "workflow_runs";
DROP TABLE "workflow_runs";
ALTER TABLE "new_workflow_runs" RENAME TO "workflow_runs";
CREATE INDEX "workflow_runs_project_id_status_idx" ON "workflow_runs"("project_id", "status");
CREATE INDEX "workflow_runs_user_id_status_idx" ON "workflow_runs"("user_id", "status");
CREATE INDEX "workflow_runs_workflow_definition_id_idx" ON "workflow_runs"("workflow_definition_id");
CREATE INDEX "workflow_runs_planning_session_id_idx" ON "workflow_runs"("planning_session_id");
CREATE INDEX "workflow_runs_webhook_event_id_idx" ON "workflow_runs"("webhook_event_id");
CREATE INDEX "workflow_runs_triggered_by_idx" ON "workflow_runs"("triggered_by");
CREATE INDEX "workflow_runs_issue_source_idx" ON "workflow_runs"("issue_source");
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");
CREATE INDEX "workflow_runs_inngest_run_id_idx" ON "workflow_runs"("inngest_run_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
