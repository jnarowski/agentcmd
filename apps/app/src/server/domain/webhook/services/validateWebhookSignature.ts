import type { WebhookSource } from "@prisma/client";
import type { SignatureValidationResult, WebhookConfig } from "../types/webhook.types";
import { validateGitHubSignature } from "../validators/github";
import { validateLinearSignature } from "../validators/linear";
import { validateJiraSignature } from "../validators/jira";
import { validateGenericSignature } from "../validators/generic";

// PUBLIC API

/**
 * Routes to appropriate signature validator based on webhook source
 *
 * @param payload - Raw request body
 * @param headers - Request headers
 * @param secret - Webhook secret
 * @param source - Webhook source type
 * @param config - Webhook configuration (needed for generic webhooks)
 * @returns Validation result
 */
export function validateWebhookSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string,
  source: WebhookSource,
  config: WebhookConfig,
): SignatureValidationResult {
  switch (source) {
    case "github":
      return validateGitHubSignature(payload, headers, secret);
    case "linear":
      return validateLinearSignature(payload, headers, secret);
    case "jira":
      return validateJiraSignature(payload, headers, secret);
    case "generic":
      return validateGenericSignature(payload, headers, secret, config.source_config);
    default:
      return { valid: false, error: `Unknown webhook source: ${source}` };
  }
}
