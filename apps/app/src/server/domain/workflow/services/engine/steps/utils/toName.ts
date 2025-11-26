/**
 * Convert idOrName to human-readable display name
 *
 * Logic:
 * - If has spaces OR uppercase → return as-is (already a display name)
 * - Otherwise → title-case: split on hyphens, capitalize each word, join with spaces
 * - No truncation (preserve full input)
 *
 * @example
 * toName("Analyze Requirements")      // "Analyze Requirements" (no change)
 * toName("analyze-requirements")      // "Analyze Requirements"
 * toName("process-data-2024")         // "Process Data 2024"
 * toName("v2-migration")              // "V2 Migration"
 */
export function toName(idOrName: string): string {
  // Handle empty input
  if (!idOrName) return "";

  // If has spaces or uppercase, already a display name
  if (/[A-Z\s]/.test(idOrName)) {
    return idOrName;
  }

  // Convert kebab-case to title case
  return idOrName
    .split("-")
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
