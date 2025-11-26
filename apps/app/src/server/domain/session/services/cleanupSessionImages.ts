import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import { cleanupTempDir } from "@/server/websocket/infrastructure/cleanup";
import type { CleanupSessionImagesOptions } from "@/server/domain/session/types/CleanupSessionImagesOptions";

/**
 * Clean up temporary image files for a session
 *
 * Removes the temporary directory used for uploaded images during session execution.
 * Updates activeSessions to clear the tempImageDir reference.
 * Non-critical operation - doesn't throw on failure.
 */
export async function cleanupSessionImages({ sessionId }: CleanupSessionImagesOptions): Promise<void> {
  const sessionData = activeSessions.get(sessionId);
  await cleanupTempDir(sessionData?.tempImageDir);

  if (sessionData) {
    activeSessions.update(sessionId, { tempImageDir: undefined });
  }
}
