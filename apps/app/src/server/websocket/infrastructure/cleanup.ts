import fs from "fs/promises";
import type { FastifyBaseLogger } from "fastify";

/**
 * Clean up temporary image directory
 * Consolidates duplicated cleanup logic from multiple places in websocket.ts
 */
export async function cleanupTempDir(
  tempDir: string | undefined,
  logger?: FastifyBaseLogger
): Promise<void> {
  if (!tempDir) {
    return;
  }

  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    logger?.warn({ err, tempDir }, "Failed to clean up temp directory");
  }
}
