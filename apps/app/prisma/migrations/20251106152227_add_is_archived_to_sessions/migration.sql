-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agent_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "agent" TEXT NOT NULL DEFAULT 'claude',
    "cli_session_id" TEXT,
    "session_path" TEXT,
    "metadata" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "error_message" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "agent_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agent_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_agent_sessions" ("agent", "cli_session_id", "created_at", "error_message", "id", "metadata", "name", "projectId", "session_path", "state", "updated_at", "userId") SELECT "agent", "cli_session_id", "created_at", "error_message", "id", "metadata", "name", "projectId", "session_path", "state", "updated_at", "userId" FROM "agent_sessions";
DROP TABLE "agent_sessions";
ALTER TABLE "new_agent_sessions" RENAME TO "agent_sessions";
CREATE INDEX "agent_sessions_projectId_updated_at_idx" ON "agent_sessions"("projectId", "updated_at");
CREATE INDEX "agent_sessions_userId_updated_at_idx" ON "agent_sessions"("userId", "updated_at");
CREATE INDEX "agent_sessions_cli_session_id_idx" ON "agent_sessions"("cli_session_id");
CREATE INDEX "agent_sessions_session_path_idx" ON "agent_sessions"("session_path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
