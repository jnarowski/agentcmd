/*
  Warnings:

  - You are about to drop the column `workflow_run_id` on the `webhook_events` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "webhook_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "headers" TEXT NOT NULL,
    "mapped_data" TEXT,
    "error_message" TEXT,
    "processing_time_ms" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_events_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_webhook_events" ("created_at", "error_message", "headers", "id", "mapped_data", "payload", "processing_time_ms", "status", "webhook_id") SELECT "created_at", "error_message", "headers", "id", "mapped_data", "payload", "processing_time_ms", "status", "webhook_id" FROM "webhook_events";
DROP TABLE "webhook_events";
ALTER TABLE "new_webhook_events" RENAME TO "webhook_events";
CREATE INDEX "webhook_events_webhook_id_created_at_idx" ON "webhook_events"("webhook_id", "created_at");
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events"("created_at");
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
INSERT INTO "new_workflow_runs" ("args", "base_branch", "branch_name", "cancelled_at", "completed_at", "created_at", "current_phase", "current_step_index", "error_message", "id", "inngest_run_id", "mode", "name", "paused_at", "planning_session_id", "pr_url", "project_id", "spec_content", "spec_file", "spec_type", "started_at", "status", "updated_at", "user_id", "workflow_definition_id") SELECT "args", "base_branch", "branch_name", "cancelled_at", "completed_at", "created_at", "current_phase", "current_step_index", "error_message", "id", "inngest_run_id", "mode", "name", "paused_at", "planning_session_id", "pr_url", "project_id", "spec_content", "spec_file", "spec_type", "started_at", "status", "updated_at", "user_id", "workflow_definition_id" FROM "workflow_runs";
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
