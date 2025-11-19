import crypto from "node:crypto";
import { prisma } from "@/shared/prisma";
import type { CreateWebhookData, WebhookWithConfig, WebhookConfig } from "../types/webhook.types";
import { WEBHOOK_SECRET_BYTES, DEFAULT_WEBHOOK_CONFIG } from "../constants/webhook.constants";

// PUBLIC API

/**
 * Creates a new webhook in draft status
 * Generates a cryptographic secret for HMAC validation
 *
 * @param data - Webhook creation data
 * @returns Created webhook with typed config
 *
 * @example
 * ```typescript
 * const webhook = await createWebhook({
 *   project_id: "proj_123",
 *   name: "GitHub PR Webhook",
 *   source: "github",
 *   workflow_identifier: "pr-review-workflow"
 * });
 * // => { id: "wh_abc", secret: "64-char-hex-string", status: "draft", ... }
 * ```
 */
export async function createWebhook(
  data: CreateWebhookData,
): Promise<WebhookWithConfig> {
  const secret = generateSecret();
  const config = data.config || DEFAULT_WEBHOOK_CONFIG;

  const webhook = await prisma.webhook.create({
    data: {
      project_id: data.project_id,
      name: data.name,
      description: data.description,
      source: data.source || "generic",
      status: "draft", // Always start in draft mode
      secret,
      workflow_identifier: data.workflow_identifier,
      config: JSON.stringify(config),
      webhook_conditions: data.webhook_conditions
        ? JSON.stringify(data.webhook_conditions)
        : undefined,
    },
  });

  return {
    ...webhook,
    config: config as WebhookConfig,
  };
}

// PRIVATE HELPERS

/**
 * Generates a cryptographic secret for HMAC validation
 * Returns 64-character hex string (32 bytes)
 */
function generateSecret(): string {
  return crypto.randomBytes(WEBHOOK_SECRET_BYTES).toString("hex");
}
