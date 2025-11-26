import crypto from "node:crypto";
import type { SignatureValidationResult } from "../types/webhook.types";
import { LINEAR_SIGNATURE_HEADER } from "../constants/webhook.constants";

// PUBLIC API

/**
 * Validates Linear webhook signature
 * Uses linear-signature header with raw hex hash
 *
 * @param payload - Raw request body
 * @param headers - Request headers
 * @param secret - Webhook secret
 * @returns Validation result
 */
export function validateLinearSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string,
): SignatureValidationResult {
  const signature = headers[LINEAR_SIGNATURE_HEADER.toLowerCase()];

  if (!signature) {
    return {
      valid: false,
      error: `Missing ${LINEAR_SIGNATURE_HEADER} header`,
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
