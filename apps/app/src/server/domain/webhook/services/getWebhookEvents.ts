import { prisma } from "@/shared/prisma";
import type { WebhookEventStatus } from "@prisma/client";

// PUBLIC API

/**
 * Gets webhook events with optional filtering and pagination
 *
 * @param webhookId - Webhook ID
 * @param options - Query options
 * @returns Array of webhook events
 */
export async function getWebhookEvents(
  webhookId: string,
  options?: {
    status?: WebhookEventStatus;
    limit?: number;
    offset?: number;
  },
) {
  return prisma.webhookEvent.findMany({
    where: {
      webhook_id: webhookId,
      ...(options?.status && { status: options.status }),
    },
    orderBy: { created_at: "desc" },
    take: options?.limit,
    skip: options?.offset,
  });
}
