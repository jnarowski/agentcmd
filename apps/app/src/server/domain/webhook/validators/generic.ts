import crypto from "node:crypto";
import type { SignatureValidationResult, SourceConfig } from "../types/webhook.types";

// PUBLIC API

/**
 * Validates generic webhook signature
 * Uses user-configured header name and HMAC method
 *
 * @param payload - Raw request body
 * @param headers - Request headers
 * @param secret - Webhook secret
 * @param config - Source configuration with signature_header and hmac_method
 * @returns Validation result
 */
export function validateGenericSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string,
  config?: SourceConfig,
): SignatureValidationResult {
  const signatureHeader = config?.signature_header || "x-webhook-signature";
  const hmacMethod = config?.hmac_method || "sha256";

  const signature = headers[signatureHeader.toLowerCase()];

  if (!signature) {
    return {
      valid: false,
      error: `Missing ${signatureHeader} header`,
    };
  }

  const hmac = crypto.createHmac(hmacMethod, secret);
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
