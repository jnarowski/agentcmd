/**
 * Get the display name for a session, with consistent fallback logic.
 *
 * Priority:
 * 1. AI-generated or user-set name (if available)
 * 2. First message preview (while name is being generated)
 * 3. "Untitled Session" (final fallback)
 */
export function getSessionDisplayName(session: {
  name?: string | null;
  metadata?: { firstMessagePreview?: string | null };
}): string {
  // 1. Use AI-generated or user-set name if available
  if (session.name) {
    return session.name;
  }

  // 2. While generating, show first message preview
  // (but not if it's the default "Untitled Session" from backend)
  if (
    session.metadata?.firstMessagePreview &&
    session.metadata.firstMessagePreview !== 'Untitled Session'
  ) {
    return session.metadata.firstMessagePreview;
  }

  // 3. Final fallback
  return 'Untitled Session';
}
