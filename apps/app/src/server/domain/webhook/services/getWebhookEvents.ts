import { prisma } from "@/shared/prisma";
import type { WebhookEventStatus } from "@prisma/client";

// PUBLIC API

/**
 * Gets webhook events with optional filtering and pagination
 *
 * @param webhookId - Webhook ID
 * @param options - Query options
 * @returns Paginated webhook events with metadata
 */
export async function getWebhookEvents(
  webhookId: string,
  options?: {
    status?: WebhookEventStatus;
    limit?: number;
    offset?: number;
  },
) {
  const where = {
    webhook_id: webhookId,
    ...(options?.status && { status: options.status }),
  };

  const [rawEvents, total] = await Promise.all([
    prisma.webhookEvent.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.webhookEvent.count({ where }),
  ]);

  // Parse JSON string fields to objects
  const events = rawEvents.map((event) => ({
    ...event,
    payload: JSON.parse(event.payload),
    headers: JSON.parse(event.headers),
    mapped_data: event.mapped_data ? JSON.parse(event.mapped_data) : null,
  }));

  return {
    events,
    total,
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
  };
}
