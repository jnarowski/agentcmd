import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type {
  SubscribeMessageData,
  UnsubscribeMessageData,
} from "../types";
import { GlobalEventTypes } from "@/shared/types";
import { Channels } from "@/shared/websocket";
import { subscribe, unsubscribe } from "../infrastructure/subscriptions";
import { validateChannelAccess } from "../infrastructure/permissions";
import { sendMessage } from "../infrastructure/send-message";

/**
 * Handle global events on the global channel
 */
export async function handleGlobalEvent(
  socket: WebSocket,
  channel: string,
  type: string,
  data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // Handle ping/pong heartbeat
  if (type === GlobalEventTypes.PING || type === "ping") {
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.PONG,
      data: { timestamp: Date.now() },
    });
    return;
  }

  // Handle subscription events
  if (type === "subscribe") {
    // DIAGNOSTIC: Log subscribe event
    console.log('[DIAGNOSTIC] handleGlobalEvent - subscribe:', {
      channel,
      data,
      userId,
    });

    // Support both formats:
    // 1. New format: {channel: "global", type: "subscribe", data: {channels: ["project:xxx"]}}
    // 2. Legacy format: {channel: "project:xxx", type: "subscribe"}
    let subscribeData = data as SubscribeMessageData | undefined;

    if (channel !== "global" && !subscribeData) {
      // Legacy format: channel field contains the channel to subscribe to
      subscribeData = { channels: [channel] };
    }

    console.log('[DIAGNOSTIC] handleGlobalEvent - calling handleSubscribe with:', {
      subscribeData,
      userId,
    });

    await handleSubscribe(socket, subscribeData!, userId, fastify);
    return;
  }

  if (type === "unsubscribe") {
    // Support both formats for unsubscribe as well
    let unsubscribeData = data as UnsubscribeMessageData | undefined;

    if (channel !== "global" && !unsubscribeData) {
      // Legacy format: channel field contains the channel to unsubscribe from
      unsubscribeData = { channels: [channel] };
    }

    await handleUnsubscribe(socket, unsubscribeData!, fastify);
    return;
  }

  // Unknown global event
  fastify.log.debug(
    { type },
    "[WebSocket] Global event received (no handler)"
  );
}

/**
 * Handle subscribe request
 */
async function handleSubscribe(
  socket: WebSocket,
  data: SubscribeMessageData,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // DIAGNOSTIC: Log handleSubscribe entry
  console.log('[DIAGNOSTIC] handleSubscribe called:', {
    data,
    userId,
    hasChannels: 'channels' in data,
    channelsValue: data?.channels,
  });

  const { channels } = data;

  if (!Array.isArray(channels)) {
    console.log('[DIAGNOSTIC] handleSubscribe - channels validation failed:', {
      channels,
      type: typeof channels,
      isArray: Array.isArray(channels),
    });
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.SUBSCRIPTION_ERROR,
      data: {
        channel: "",
        error: "Invalid subscribe request: channels must be an array",
      },
    });
    return;
  }

  const subscribedChannels: string[] = [];
  const deniedChannels: Array<{ channelId: string; reason: string }> = [];

  // Validate and subscribe to each channel
  for (const channelId of channels) {
    console.log('[DIAGNOSTIC] handleSubscribe - processing channel:', {
      channelId,
      userId,
    });

    const validation = await validateChannelAccess(channelId, userId);

    console.log('[DIAGNOSTIC] handleSubscribe - validation result:', {
      channelId,
      allowed: validation.allowed,
      reason: validation.reason,
    });

    if (validation.allowed) {
      subscribe(channelId, socket);
      subscribedChannels.push(channelId);
      console.log('[DIAGNOSTIC] handleSubscribe - subscribed successfully:', {
        channelId,
        userId,
      });
      fastify.log.info(
        { userId, channelId },
        "[WebSocket] User subscribed to channel"
      );
    } else {
      deniedChannels.push({
        channelId,
        reason: validation.reason || "Access denied",
      });
      fastify.log.warn(
        { userId, channelId, reason: validation.reason },
        "[WebSocket] Subscription denied"
      );
    }
  }

  // Send success response for subscribed channels
  if (subscribedChannels.length > 0) {
    for (const channel of subscribedChannels) {
      sendMessage(socket, Channels.global(), {
        type: GlobalEventTypes.SUBSCRIPTION_SUCCESS,
        data: {
          channel,
        },
      });
    }
  }

  // Send error responses for denied channels
  for (const { channelId, reason } of deniedChannels) {
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.SUBSCRIPTION_ERROR,
      data: {
        channel: channelId,
        error: reason,
      },
    });
  }
}

/**
 * Handle unsubscribe request
 */
async function handleUnsubscribe(
  socket: WebSocket,
  data: UnsubscribeMessageData,
  fastify: FastifyInstance
): Promise<void> {
  const { channels } = data;

  if (!Array.isArray(channels)) {
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.SUBSCRIPTION_ERROR,
      data: {
        channel: "",
        error: "Invalid unsubscribe request: channels must be an array",
      },
    });
    return;
  }

  // Unsubscribe from each channel
  for (const channelId of channels) {
    unsubscribe(channelId, socket);
    fastify.log.info(
      { channelId },
      "[WebSocket] Socket unsubscribed from channel"
    );
  }

  // Send confirmation for each channel
  for (const channel of channels) {
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.SUBSCRIPTION_SUCCESS,
      data: {
        channel,
      },
    });
  }
}
