import crypto from "node:crypto";
import { prisma } from "@/shared/prisma";
import type { CreateWebhookData, WebhookWithConfig } from "../types/webhook.types";
import { DEFAULT_WEBHOOK_CONFIG, WEBHOOK_SECRET_BYTES } from "../constants/webhook.constants";
import { webhookConfigSchema } from "../schemas/webhook.schemas";

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
 *   secret: "abc123..." // From Linear webhook settings
 * });
 * // => { id: "wh_abc", secret: "abc123...", status: "draft", ... }
 * ```
 */
export async function createWebhook(
  data: CreateWebhookData,
): Promise<WebhookWithConfig> {
  // Default to empty mappings array if not provided
  const config = data.config || DEFAULT_WEBHOOK_CONFIG;

  // Validate config structure
  const validationResult = webhookConfigSchema.safeParse(config);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    throw new Error(firstError?.message || "Invalid webhook configuration");
  }

  // Generate secret if not provided
  const secret = data.secret || crypto.randomBytes(WEBHOOK_SECRET_BYTES).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      project_id: data.project_id,
      name: data.name,
      description: data.description,
      source: data.source || "generic",
      status: "draft", // Always start in draft mode
      secret,
      config: config as unknown as never,
    },
  });

  return webhook as unknown as WebhookWithConfig;
}
