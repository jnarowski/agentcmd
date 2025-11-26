import { prisma } from "@/shared/prisma";

// PUBLIC API

/**
 * Marks a webhook as errored
 * Sets error status and stores error message
 *
 * @param id - Webhook ID
 * @param errorMessage - Error message to store
 *
 * @throws Error if webhook not found
 */
export async function markWebhookError(
  id: string,
  errorMessage: string,
): Promise<void> {
  await prisma.webhook.update({
    where: { id },
    data: {
      status: "error",
      error_message: errorMessage,
    },
  });
}
