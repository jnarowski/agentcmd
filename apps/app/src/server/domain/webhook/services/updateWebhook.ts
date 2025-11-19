import { prisma } from "@/shared/prisma";
import type { UpdateWebhookData, WebhookWithConfig } from "../types/webhook.types";

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
  if (data.workflow_identifier !== undefined)
    updateData.workflow_identifier = data.workflow_identifier;
  if (data.config !== undefined)
    updateData.config = JSON.stringify(data.config);
  if (data.webhook_conditions !== undefined)
    updateData.webhook_conditions = JSON.stringify(data.webhook_conditions);

  const webhook = await prisma.webhook.update({
    where: { id },
    data: updateData,
  });

  return {
    ...webhook,
    config: JSON.parse(webhook.config as string),
  };
}
