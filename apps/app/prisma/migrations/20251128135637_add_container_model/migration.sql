-- AlterTable
ALTER TABLE "projects" ADD COLUMN "preview_config" JSONB;

-- CreateTable
CREATE TABLE "containers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_run_id" TEXT,
    "project_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ports" JSONB NOT NULL,
    "container_ids" JSONB,
    "compose_project" TEXT,
    "working_dir" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME,
    "stopped_at" DATETIME,
    CONSTRAINT "containers_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "containers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "containers_workflow_run_id_key" ON "containers"("workflow_run_id");

-- CreateIndex
CREATE INDEX "containers_project_id_idx" ON "containers"("project_id");

-- CreateIndex
CREATE INDEX "containers_status_idx" ON "containers"("status");
