import { prisma } from "@/shared/prisma";

// PUBLIC API

/**
 * Deletes a webhook and all associated events
 *
 * @param id - Webhook ID
 *
 * @throws Error if webhook not found
 */
export async function deleteWebhook(id: string): Promise<void> {
  await prisma.webhook.delete({
    where: { id },
  });
}
