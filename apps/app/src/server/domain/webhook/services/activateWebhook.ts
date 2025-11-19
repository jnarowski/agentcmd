import { prisma } from "@/shared/prisma";
import { getWebhookById } from "./getWebhookById";

// PUBLIC API

/**
 * Activates a webhook
 * Validates that webhook has required configuration
 *
 * @param id - Webhook ID
 *
 * @throws Error if webhook not found or missing required config
 */
export async function activateWebhook(id: string): Promise<void> {
  const webhook = await getWebhookById(id);

  if (!webhook) {
    throw new Error(`Webhook ${id} not found`);
  }

  // Validate required configuration
  if (!webhook.workflow_identifier) {
    throw new Error("Webhook must have workflow_identifier to activate");
  }

  await prisma.webhook.update({
    where: { id },
    data: {
      status: "active",
      error_message: null, // Clear any previous errors
    },
  });
}
