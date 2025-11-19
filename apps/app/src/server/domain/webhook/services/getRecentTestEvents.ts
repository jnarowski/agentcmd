import { prisma } from "@/shared/prisma";

// PUBLIC API

/**
 * Gets recent test events for a webhook
 * Useful for building configuration based on captured test payloads
 *
 * @param webhookId - Webhook ID
 * @param limit - Maximum number of events to return (default: 10)
 * @returns Array of test events
 */
export async function getRecentTestEvents(
  webhookId: string,
  limit = 10,
) {
  return prisma.webhookEvent.findMany({
    where: {
      webhook_id: webhookId,
      status: "test",
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });
}
