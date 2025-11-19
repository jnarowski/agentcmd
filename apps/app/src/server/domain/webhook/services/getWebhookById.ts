import { prisma } from "@/shared/prisma";
import type { WebhookWithConfig } from "../types/webhook.types";

// PUBLIC API

/**
 * Gets a webhook by ID
 *
 * @param id - Webhook ID
 * @returns Webhook with typed config, or null if not found
 */
export async function getWebhookById(
  id: string,
): Promise<WebhookWithConfig | null> {
  const webhook = await prisma.webhook.findUnique({
    where: { id },
  });

  if (!webhook) {
    return null;
  }

  return {
    ...webhook,
    config: JSON.parse(webhook.config as string),
  };
}
