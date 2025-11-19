import crypto from "node:crypto";
import { prisma } from "@/shared/prisma";
import { WEBHOOK_SECRET_BYTES } from "../constants/webhook.constants";

// PUBLIC API

/**
 * Rotates a webhook's secret
 * Generates a new cryptographic secret for HMAC validation
 *
 * @param id - Webhook ID
 * @returns New secret (64-character hex string)
 *
 * @throws Error if webhook not found
 */
export async function rotateWebhookSecret(id: string): Promise<string> {
  const newSecret = crypto.randomBytes(WEBHOOK_SECRET_BYTES).toString("hex");

  await prisma.webhook.update({
    where: { id },
    data: { secret: newSecret },
  });

  return newSecret;
}
