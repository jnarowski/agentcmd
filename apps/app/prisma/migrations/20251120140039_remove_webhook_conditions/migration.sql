/*
  Warnings:

  - You are about to alter the column `metadata` on the `agent_sessions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `settings` on the `users` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to drop the column `webhook_conditions` on the `webhooks` table. All the data in the column will be lost.
  - You are about to alter the column `config` on the `webhooks` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `args_schema` on the `workflow_definitions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `phases` on the `workflow_definitions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `event_data` on the `workflow_events` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `args` on the `workflow_run_steps` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `output` on the `workflow_run_steps` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `args` on the `workflow_runs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agent_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "name_generated_at" DATETIME,
    "agent" TEXT NOT NULL DEFAULT 'claude',
    "type" TEXT NOT NULL DEFAULT 'chat',
    "permission_mode" TEXT NOT NULL DEFAULT 'default',
    "cli_session_id" TEXT,
    "session_path" TEXT,
    "metadata" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "error_message" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "agent_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agent_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_agent_sessions" ("agent", "archived_at", "cli_session_id", "created_at", "error_message", "id", "is_archived", "metadata", "name", "name_generated_at", "permission_mode", "project_id", "session_path", "state", "type", "updated_at", "user_id") SELECT "agent", "archived_at", "cli_session_id", "created_at", "error_message", "id", "is_archived", "metadata", "name", "name_generated_at", "permission_mode", "project_id", "session_path", "state", "type", "updated_at", "user_id" FROM "agent_sessions";
DROP TABLE "agent_sessions";
ALTER TABLE "new_agent_sessions" RENAME TO "agent_sessions";
CREATE INDEX "agent_sessions_project_id_updated_at_idx" ON "agent_sessions"("project_id", "updated_at");
CREATE INDEX "agent_sessions_user_id_updated_at_idx" ON "agent_sessions"("user_id", "updated_at");
CREATE INDEX "agent_sessions_cli_session_id_idx" ON "agent_sessions"("cli_session_id");
CREATE INDEX "agent_sessions_session_path_idx" ON "agent_sessions"("session_path");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB
);
INSERT INTO "new_users" ("created_at", "email", "id", "is_active", "last_login", "password_hash", "settings") SELECT "created_at", "email", "id", "is_active", "last_login", "password_hash", "settings" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE TABLE "new_webhooks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'generic',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "secret" TEXT NOT NULL,
    "workflow_identifier" TEXT,
    "config" JSONB NOT NULL,
    "error_message" TEXT,
    "last_triggered_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "webhooks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_webhooks" ("config", "created_at", "description", "error_message", "id", "last_triggered_at", "name", "project_id", "secret", "source", "status", "updated_at", "workflow_identifier") SELECT "config", "created_at", "description", "error_message", "id", "last_triggered_at", "name", "project_id", "secret", "source", "status", "updated_at", "workflow_identifier" FROM "webhooks";
DROP TABLE "webhooks";
ALTER TABLE "new_webhooks" RENAME TO "webhooks";
CREATE INDEX "webhooks_project_id_idx" ON "webhooks"("project_id");
CREATE INDEX "webhooks_status_idx" ON "webhooks"("status");
CREATE INDEX "webhooks_source_idx" ON "webhooks"("source");
CREATE TABLE "new_workflow_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "phases" JSONB NOT NULL,
    "args_schema" JSONB,
    "is_template" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "file_exists" BOOLEAN NOT NULL DEFAULT true,
    "load_error" TEXT,
    "archived_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_definitions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workflow_definitions" ("archived_at", "args_schema", "created_at", "description", "file_exists", "id", "identifier", "is_template", "load_error", "name", "path", "phases", "project_id", "status", "type", "updated_at") SELECT "archived_at", "args_schema", "created_at", "description", "file_exists", "id", "identifier", "is_template", "load_error", "name", "path", "phases", "project_id", "status", "type", "updated_at" FROM "workflow_definitions";
DROP TABLE "workflow_definitions";
ALTER TABLE "new_workflow_definitions" RENAME TO "workflow_definitions";
CREATE INDEX "workflow_definitions_type_idx" ON "workflow_definitions"("type");
CREATE INDEX "workflow_definitions_is_template_idx" ON "workflow_definitions"("is_template");
CREATE INDEX "workflow_definitions_project_id_idx" ON "workflow_definitions"("project_id");
CREATE INDEX "workflow_definitions_status_idx" ON "workflow_definitions"("status");
CREATE INDEX "workflow_definitions_project_id_status_idx" ON "workflow_definitions"("project_id", "status");
CREATE UNIQUE INDEX "workflow_definitions_project_id_identifier_key" ON "workflow_definitions"("project_id", "identifier");
CREATE TABLE "new_workflow_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_run_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "phase" TEXT,
    "inngest_step_id" TEXT,
    "created_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_events_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workflow_events" ("created_at", "created_by_user_id", "event_data", "event_type", "id", "inngest_step_id", "phase", "updated_at", "workflow_run_id") SELECT "created_at", "created_by_user_id", "event_data", "event_type", "id", "inngest_step_id", "phase", "updated_at", "workflow_run_id" FROM "workflow_events";
DROP TABLE "workflow_events";
ALTER TABLE "new_workflow_events" RENAME TO "workflow_events";
CREATE INDEX "workflow_events_workflow_run_id_created_at_idx" ON "workflow_events"("workflow_run_id", "created_at");
CREATE INDEX "workflow_events_event_type_idx" ON "workflow_events"("event_type");
CREATE INDEX "workflow_events_phase_idx" ON "workflow_events"("phase");
CREATE TABLE "new_workflow_run_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_run_id" TEXT NOT NULL,
    "inngest_step_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "step_type" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "args" JSONB,
    "output" JSONB,
    "agent_session_id" TEXT,
    "error_message" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_run_steps_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_run_steps_agent_session_id_fkey" FOREIGN KEY ("agent_session_id") REFERENCES "agent_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workflow_run_steps" ("agent_session_id", "args", "completed_at", "created_at", "error_message", "id", "inngest_step_id", "name", "output", "phase", "started_at", "status", "step_type", "updated_at", "workflow_run_id") SELECT "agent_session_id", "args", "completed_at", "created_at", "error_message", "id", "inngest_step_id", "name", "output", "phase", "started_at", "status", "step_type", "updated_at", "workflow_run_id" FROM "workflow_run_steps";
DROP TABLE "workflow_run_steps";
ALTER TABLE "new_workflow_run_steps" RENAME TO "workflow_run_steps";
CREATE INDEX "workflow_run_steps_workflow_run_id_status_idx" ON "workflow_run_steps"("workflow_run_id", "status");
CREATE INDEX "workflow_run_steps_agent_session_id_idx" ON "workflow_run_steps"("agent_session_id");
CREATE INDEX "workflow_run_steps_status_idx" ON "workflow_run_steps"("status");
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
    CONSTRAINT "workflow_runs_planning_session_id_fkey" FOREIGN KEY ("planning_session_id") REFERENCES "agent_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_workflow_runs" ("args", "base_branch", "branch_name", "cancelled_at", "completed_at", "created_at", "current_phase", "current_step_index", "error_message", "id", "inngest_run_id", "mode", "name", "paused_at", "planning_session_id", "pr_url", "project_id", "spec_content", "spec_file", "spec_type", "started_at", "status", "updated_at", "user_id", "workflow_definition_id") SELECT "args", "base_branch", "branch_name", "cancelled_at", "completed_at", "created_at", "current_phase", "current_step_index", "error_message", "id", "inngest_run_id", "mode", "name", "paused_at", "planning_session_id", "pr_url", "project_id", "spec_content", "spec_file", "spec_type", "started_at", "status", "updated_at", "user_id", "workflow_definition_id" FROM "workflow_runs";
DROP TABLE "workflow_runs";
ALTER TABLE "new_workflow_runs" RENAME TO "workflow_runs";
CREATE INDEX "workflow_runs_project_id_status_idx" ON "workflow_runs"("project_id", "status");
CREATE INDEX "workflow_runs_user_id_status_idx" ON "workflow_runs"("user_id", "status");
CREATE INDEX "workflow_runs_workflow_definition_id_idx" ON "workflow_runs"("workflow_definition_id");
CREATE INDEX "workflow_runs_planning_session_id_idx" ON "workflow_runs"("planning_session_id");
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");
CREATE INDEX "workflow_runs_inngest_run_id_idx" ON "workflow_runs"("inngest_run_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
