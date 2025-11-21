/*
  Warnings:

  - You are about to drop the column `workflow_identifier` on the `webhooks` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_webhooks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'generic',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "secret" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "error_message" TEXT,
    "last_triggered_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "webhooks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_webhooks" ("config", "created_at", "description", "error_message", "id", "last_triggered_at", "name", "project_id", "secret", "source", "status", "updated_at") SELECT "config", "created_at", "description", "error_message", "id", "last_triggered_at", "name", "project_id", "secret", "source", "status", "updated_at" FROM "webhooks";
DROP TABLE "webhooks";
ALTER TABLE "new_webhooks" RENAME TO "webhooks";
CREATE INDEX "webhooks_project_id_idx" ON "webhooks"("project_id");
CREATE INDEX "webhooks_status_idx" ON "webhooks"("status");
CREATE INDEX "webhooks_source_idx" ON "webhooks"("source");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
