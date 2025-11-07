/**
 * Server configuration
 * Centralized access to environment variables
 */

export const config = {
  workflow: {
    /** Enable workflow engine */
    enabled: process.env.WORKFLOW_ENGINE_ENABLED !== "false",
    /** Application ID for Inngest */
    appId: process.env.INNGEST_APP_ID ?? "sourceborn-workflows",
    /** Event key for webhook authentication (optional in dev) */
    eventKey: process.env.INNGEST_EVENT_KEY,
    /** Enable development mode */
    devMode: process.env.INNGEST_DEV_MODE !== "false",
    /** Path to SQLite memoization database */
    memoizationDbPath:
      process.env.INNGEST_MEMOIZATION_DB_PATH ?? "./prisma/workflows.db",
    /** Inngest serve path */
    servePath: process.env.INNGEST_SERVE_PATH ?? "/api/workflows/inngest",
  },
};

export default config;
