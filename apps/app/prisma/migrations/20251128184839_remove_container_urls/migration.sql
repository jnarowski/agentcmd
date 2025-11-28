/*
  Warnings:

  - You are about to drop the column `urls` on the `containers` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_containers" (
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
INSERT INTO "new_containers" ("compose_project", "container_ids", "created_at", "error_message", "id", "ports", "project_id", "started_at", "status", "stopped_at", "workflow_run_id", "working_dir") SELECT "compose_project", "container_ids", "created_at", "error_message", "id", "ports", "project_id", "started_at", "status", "stopped_at", "workflow_run_id", "working_dir" FROM "containers";
DROP TABLE "containers";
ALTER TABLE "new_containers" RENAME TO "containers";
CREATE UNIQUE INDEX "containers_workflow_run_id_key" ON "containers"("workflow_run_id");
CREATE INDEX "containers_project_id_idx" ON "containers"("project_id");
CREATE INDEX "containers_status_idx" ON "containers"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
