-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_workflow_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL DEFAULT 'project',
    "project_id" TEXT,
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
CREATE INDEX "workflow_definitions_scope_idx" ON "workflow_definitions"("scope");
CREATE INDEX "workflow_definitions_project_id_status_idx" ON "workflow_definitions"("project_id", "status");
CREATE UNIQUE INDEX "workflow_definitions_scope_identifier_key" ON "workflow_definitions"("scope", "identifier");
CREATE UNIQUE INDEX "workflow_definitions_project_id_identifier_key" ON "workflow_definitions"("project_id", "identifier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
