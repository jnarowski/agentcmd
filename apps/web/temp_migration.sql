-- DropIndex
DROP INDEX "projects_path_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agent_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "name" TEXT,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_agent_sessions" ("created_at", "id", "metadata", "name", "projectId", "updated_at", "userId") SELECT "created_at", "id", "metadata", "name", "projectId", "updated_at", "userId" FROM "agent_sessions";
DROP TABLE "agent_sessions";
ALTER TABLE "new_agent_sessions" RENAME TO "agent_sessions";
CREATE INDEX "agent_sessions_userId_updated_at_idx" ON "agent_sessions"("userId" ASC, "updated_at" ASC);
CREATE INDEX "agent_sessions_projectId_updated_at_idx" ON "agent_sessions"("projectId" ASC, "updated_at" ASC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

