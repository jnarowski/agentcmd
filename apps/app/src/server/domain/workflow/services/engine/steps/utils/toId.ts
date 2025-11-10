/**
 * Convert idOrName to valid ID format (kebab-case, 64 char max)
 *
 * Logic:
 * - If already kebab-case (no spaces, no uppercase) → return as-is (maybe truncate)
 * - Otherwise → slugify: lowercase, spaces/underscores → hyphens, strip non-ASCII,
 *   preserve numbers, collapse hyphens
 * - Hard truncate to 64 characters
 *
 * @example
 * toId("Analyze Requirements")        // "analyze-requirements"
 * toId("analyze-requirements")        // "analyze-requirements" (no change)
 * toId("Process Data (2024)")         // "process-data-2024"
 * toId("Très  Long__Annotation!!!")   // "trs-long-annotation"
 * toId("A".repeat(100))               // "a".repeat(64) (truncated)
 */
export function toId(idOrName: string): string {
  // Handle empty input
  if (!idOrName) return "";

  // Special case: Preserve _system_ prefix for system phases
  const isSystemPhase = idOrName.startsWith("_system_");
  if (isSystemPhase) {
    // Keep _system_ prefix intact, process the rest normally
    return idOrName.slice(0, 64);
  }

  // Check if already kebab-case (no spaces, no uppercase, no underscores)
  const isKebabCase = !/[A-Z\s_]/.test(idOrName);

  if (isKebabCase) {
    // Already in ID format, just clean up edge cases and truncate
    const cleaned = idOrName
      // Remove non-alphanumeric characters except hyphens
      .replace(/[^a-z0-9-]/g, "")
      // Collapse multiple consecutive hyphens
      .replace(/-+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "");

    return cleaned.slice(0, 64);
  }

  // Slugify: convert to lowercase, replace spaces/underscores with hyphens
  const slug = idOrName
    .toLowerCase()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Strip non-ASCII characters (keep alphanumeric and hyphens)
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\x7F]/g, "")
    // Remove non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, "")
    // Collapse multiple consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");

  // Hard truncate to 64 characters
  return slug.slice(0, 64);
}
