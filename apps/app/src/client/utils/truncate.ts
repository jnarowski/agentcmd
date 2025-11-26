/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 * Useful for consistent text truncation across the app.
 */
export function truncate(
  text: string,
  maxLength: number,
  ellipsis: string = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Truncates text intelligently at word boundaries when possible.
 * Falls back to character truncation for very long words.
 */
export function truncateAtWord(
  text: string,
  maxLength: number,
  ellipsis: string = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncatedLength = maxLength - ellipsis.length;
  const truncated = text.slice(0, truncatedLength);

  // Try to find the last space to break at word boundary
  const lastSpace = truncated.lastIndexOf(" ");

  // If we found a space and it's not too far back, use it
  if (lastSpace > truncatedLength * 0.7) {
    return truncated.slice(0, lastSpace) + ellipsis;
  }

  // Otherwise just truncate at character boundary
  return truncated + ellipsis;
}

/**
 * Truncates text from the middle, keeping start and end visible.
 * Useful for file paths or long identifiers where both ends matter.
 */
export function truncateMiddle(
  text: string,
  maxLength: number,
  ellipsis: string = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }

  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return (
    text.slice(0, frontChars) + ellipsis + text.slice(text.length - backChars)
  );
}
