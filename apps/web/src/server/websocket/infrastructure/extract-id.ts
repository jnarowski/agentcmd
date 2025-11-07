/**
 * Extract ID from event type (e.g., "session.123.send_message" -> "123")
 */
export function extractId(
  type: string,
  prefix: "session" | "shell"
): string | null {
  const parts = type.split(".");
  if (parts[0] === prefix && parts.length >= 3) {
    return parts[1];
  }
  return null;
}
