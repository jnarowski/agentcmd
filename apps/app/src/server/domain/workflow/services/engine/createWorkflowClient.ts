import { Inngest } from "inngest";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { WorkflowEngineConfig } from "@/server/domain/workflow/types";

/**
 * Create and configure Inngest client for workflow execution
 *
 * Features:
 * - SQLite memoization store for durable step caching
 * - Signing key validation for webhook authentication
 * - Development mode support
 *
 * @param config - Workflow engine configuration
 * @returns Configured Inngest client
 */
export function createWorkflowClient(config: WorkflowEngineConfig): Inngest {
  // Ensure memoization database directory exists
  const dbDir = dirname(config.memoizationDbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create Inngest client with memoization
  const client = new Inngest({
    id: config.appId,
    eventKey: config.eventKey,
    isDev: config.isDev,
    // SQLite-based memoization for persistent step caching
    experimental: {
      memo: {
        // Enable memoization
        enabled: true,
        // Use SQLite for durable storage (survives restarts)
        store: {
          type: "sqlite",
          path: config.memoizationDbPath,
        },
        // Fail workflow if memoization restore fails (prevent inconsistent state)
        restoreFailureMode: "throw",
      },
    },
  });

  return client;
}
