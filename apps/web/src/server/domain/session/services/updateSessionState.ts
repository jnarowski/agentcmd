import type { AgentSession } from "@prisma/client";
import { updateSession } from "./updateSession";
import type { UpdateSessionStateOptions } from '../types/UpdateSessionStateOptions';

/**
 * Update session state with proper validation and error handling
 *
 * Handles state transitions for agent sessions:
 * - idle → working: Message execution started
 * - working → idle: Message completed successfully
 * - working → error: Message failed
 * - * → idle: Cancel/reset
 */
export async function updateSessionState({
  id: sessionId,
  data: { state, errorMessage },
  shouldBroadcast = true
}: UpdateSessionStateOptions): Promise<AgentSession> {
  // Build update data based on state
  const updateData: Partial<AgentSession> = {
    state,
  };

  // Clear error_message when transitioning to working/idle
  if (state === "working" || state === "idle") {
    updateData.error_message = null;
  }

  // Set error_message when transitioning to error
  if (state === "error") {
    updateData.error_message = errorMessage || "An unknown error occurred";
  }

  // Use generic updateSession service
  return await updateSession({ id: sessionId, data: updateData, shouldBroadcast });
}
