import crypto from "node:crypto";
import type { SignatureValidationResult } from "../types/webhook.types";
import { GITHUB_SIGNATURE_HEADER } from "../constants/webhook.constants";

// PUBLIC API

/**
 * Validates GitHub webhook signature
 * Uses x-hub-signature-256 header with sha256=${hash} format
 *
 * @param payload - Raw request body
 * @param headers - Request headers
 * @param secret - Webhook secret
 * @returns Validation result
 */
export function validateGitHubSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string,
): SignatureValidationResult {
  const signature = headers[GITHUB_SIGNATURE_HEADER.toLowerCase()];

  if (!signature) {
    return {
      valid: false,
      error: `Missing ${GITHUB_SIGNATURE_HEADER} header`,
    };
  }

  // GitHub format: "sha256=<hash>"
  const expectedHash = signature.replace("sha256=", "");

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const computedHash = hmac.digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(expectedHash),
    Buffer.from(computedHash),
  );

  return {
    valid,
    error: valid ? undefined : "Invalid signature",
  };
}
