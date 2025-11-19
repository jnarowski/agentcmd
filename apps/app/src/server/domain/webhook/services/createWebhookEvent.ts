import { prisma } from "@/shared/prisma";
import type { WebhookEventStatus } from "@prisma/client";

// PUBLIC API

/**
 * Creates a webhook event record
 *
 * @param data - Webhook event data
 * @returns Created webhook event
 */
export async function createWebhookEvent(data: {
  webhook_id: string;
  workflow_run_id?: string;
  status: WebhookEventStatus;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  mapped_data?: Record<string, unknown>;
  error_message?: string;
  processing_time_ms?: number;
}) {
  return prisma.webhookEvent.create({
    data: {
      webhook_id: data.webhook_id,
      workflow_run_id: data.workflow_run_id,
      status: data.status,
      payload: JSON.stringify(data.payload),
      headers: JSON.stringify(data.headers),
      mapped_data: data.mapped_data
        ? JSON.stringify(data.mapped_data)
        : undefined,
      error_message: data.error_message,
      processing_time_ms: data.processing_time_ms,
    },
  });
}
