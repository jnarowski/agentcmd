import { prisma } from "@/shared/prisma";
import type { UpdateWebhookData, WebhookWithConfig } from "../types/webhook.types";
import { webhookConfigSchema } from "../schemas/webhook.schemas";

// PUBLIC API

/**
 * Updates a webhook
 *
 * @param id - Webhook ID
 * @param data - Update data
 * @returns Updated webhook with typed config
 *
 * @throws Error if webhook not found
 */
export async function updateWebhook(
  id: string,
  data: UpdateWebhookData,
): Promise<WebhookWithConfig> {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  // Only update secret if a non-empty value is provided (empty string = keep existing)
  if (data.secret !== undefined && data.secret !== "") updateData.secret = data.secret;

  // Validate config if provided
  if (data.config !== undefined) {
    const validationResult = webhookConfigSchema.safeParse(data.config);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      throw new Error(firstError?.message || "Invalid webhook configuration");
    }
    updateData.config = data.config;
  }

  const webhook = await prisma.webhook.update({
    where: { id },
    data: updateData,
  });

  return webhook as unknown as WebhookWithConfig;
}
