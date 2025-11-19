import { prisma } from "@/shared/prisma";
import type { WebhookWithConfig } from "../types/webhook.types";

// PUBLIC API

/**
 * Gets all webhooks for a project
 *
 * @param projectId - Project ID
 * @returns Array of webhooks with typed configs
 */
export async function getWebhooksByProject(
  projectId: string,
): Promise<WebhookWithConfig[]> {
  const webhooks = await prisma.webhook.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: "desc" },
  });

  return webhooks.map((webhook) => ({
    ...webhook,
    config: JSON.parse(webhook.config as string),
  }));
}
