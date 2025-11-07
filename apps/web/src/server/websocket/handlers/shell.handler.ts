import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { sendMessage } from "../infrastructure/send-message";
import { GlobalEventTypes, ShellEventTypes } from "@/shared/types/websocket.types";
import { Channels, parseChannel } from "@/shared/websocket";

/**
 * Handle shell events on shell channels (shell:id)
 * Currently stubbed - shell functionality not yet implemented
 */
export async function handleShellEvent(
  socket: WebSocket,
  channel: string,
  type: string,
  _data: unknown,
  _userId: string,
  fastify: FastifyInstance
): Promise<void> {
  const parsed = parseChannel(channel);
  const shellId = parsed?.id;

  if (!shellId || parsed?.resource !== "shell") {
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.ERROR,
      data: {
        error: "Invalid shell channel",
        message: `Expected format: shell:id, got: ${channel}`,
      },
    });
    return;
  }

  // TODO: Implement shell functionality when ready
  fastify.log.info(
    { type, shellId },
    "[WebSocket] Shell event received (not implemented yet)"
  );
  sendMessage(socket, Channels.shell(shellId), {
    type: ShellEventTypes.ERROR,
    data: {
      error: "Shell functionality not implemented",
      message: "Shell/terminal features are not yet implemented",
      sessionId: shellId,
    },
  });
}
