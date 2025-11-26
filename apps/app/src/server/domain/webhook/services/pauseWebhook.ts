import { prisma } from "@/shared/prisma";

// PUBLIC API

/**
 * Pauses a webhook
 * Webhook will capture test events but not trigger workflow runs
 *
 * @param id - Webhook ID
 *
 * @throws Error if webhook not found
 */
export async function pauseWebhook(id: string): Promise<void> {
  await prisma.webhook.update({
    where: { id },
    data: {
      status: "paused",
    },
  });
}
