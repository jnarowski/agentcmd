import { prisma } from "@/shared/prisma";
import { getWebhookById } from "./getWebhookById";
import type { WebhookConfig } from "../types/webhook.types";

// PUBLIC API

/**
 * Activates a webhook
 * Validates that webhook has required configuration (mappings with workflows)
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
  const config = webhook.config as WebhookConfig | null;

  if (!config || !config.mappings || config.mappings.length === 0) {
    throw new Error("Webhook must have at least one mapping to activate");
  }

  // Validate name template is present
  if (!config.name || config.name.trim().length === 0) {
    throw new Error("Webhook must have a workflow run name template to activate");
  }

  // Validate each mapping has a workflow_definition_id
  const invalidMappings = config.mappings.filter(m => !m.workflow_definition_id);
  if (invalidMappings.length > 0) {
    throw new Error("All mappings must have a workflow selected");
  }

  await prisma.webhook.update({
    where: { id },
    data: {
      status: "active",
      error_message: null, // Clear any previous errors
    },
  });
}
