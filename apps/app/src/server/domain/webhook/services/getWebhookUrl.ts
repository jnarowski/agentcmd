import { config } from "@/server/config";

// PUBLIC API

/**
 * Gets the full webhook URL for a given webhook ID
 *
 * @param webhookId - Webhook ID
 * @returns Full webhook URL (uses WEBHOOK_BASE_URL or falls back to server URL)
 */
export function getWebhookUrl(webhookId: string): string {
  const baseUrl =
    config.webhook.baseUrl ||
    `http://${config.server.host}:${config.server.port}`;

  return `${baseUrl}/api/webhooks/${webhookId}/events`;
}
