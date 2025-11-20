import { prisma } from "@/shared/prisma";
import type { CreateWebhookData, WebhookWithConfig } from "../types/webhook.types";
import { DEFAULT_WEBHOOK_CONFIG } from "../constants/webhook.constants";

// PUBLIC API

/**
 * Creates a new webhook in draft status
 * Stores HMAC secret from external service (Linear, GitHub, etc.)
 *
 * @param data - Webhook creation data with secret from provider
 * @returns Created webhook with typed config
 *
 * @example
 * ```typescript
 * const webhook = await createWebhook({
 *   project_id: "proj_123",
 *   name: "Linear Issue Webhook",
 *   source: "linear",
 *   secret: "abc123...", // From Linear webhook settings
 *   workflow_identifier: "issue-workflow"
 * });
 * // => { id: "wh_abc", secret: "abc123...", status: "draft", ... }
 * ```
 */
export async function createWebhook(
  data: CreateWebhookData,
): Promise<WebhookWithConfig> {
  const config = data.config || DEFAULT_WEBHOOK_CONFIG;

  const webhook = await prisma.webhook.create({
    data: {
      project_id: data.project_id,
      name: data.name,
      description: data.description,
      source: data.source || "generic",
      status: "draft", // Always start in draft mode
      secret: data.secret || "",
      workflow_identifier: data.workflow_identifier,
      config: config as unknown as never,
      webhook_conditions: data.webhook_conditions as unknown as never,
    },
  });

  return webhook as unknown as WebhookWithConfig;
}
