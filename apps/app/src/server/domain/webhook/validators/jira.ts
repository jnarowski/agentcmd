import crypto from "node:crypto";
import type { SignatureValidationResult } from "../types/webhook.types";
import { JIRA_SIGNATURE_HEADER } from "../constants/webhook.constants";

// PUBLIC API

/**
 * Validates Jira webhook signature
 * Uses x-hub-signature header
 *
 * @param payload - Raw request body
 * @param headers - Request headers
 * @param secret - Webhook secret
 * @returns Validation result
 */
export function validateJiraSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string,
): SignatureValidationResult {
  const signature = headers[JIRA_SIGNATURE_HEADER.toLowerCase()];

  if (!signature) {
    return {
      valid: false,
      error: `Missing ${JIRA_SIGNATURE_HEADER} header`,
    };
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const computedHash = hmac.digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedHash),
  );

  return {
    valid,
    error: valid ? undefined : "Invalid signature",
  };
}
