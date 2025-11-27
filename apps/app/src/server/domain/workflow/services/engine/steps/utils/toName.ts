/**
 * Convert idOrName to human-readable display name
 *
 * Logic:
 * - If has spaces OR uppercase → return as-is (already a display name)
 * - Otherwise → title-case with semantic dash preservation:
 *   - Single dash (-): word separator → space
 *   - Double dash (--): semantic separator → " - " (space-dash-space)
 * - No truncation (preserve full input)
 *
 * @example
 * toName("Analyze Requirements")              // "Analyze Requirements" (no change)
 * toName("analyze-requirements")              // "Analyze Requirements"
 * toName("implement-cycle-1--attempt-1")      // "Implement Cycle 1 - Attempt 1"
 * toName("phase-1--stage-2--step-3")          // "Phase 1 - Stage 2 - Step 3"
 * toName("process-data-2024")                 // "Process Data 2024"
 */
export function toName(idOrName: string): string {
  // Handle empty input
  if (!idOrName) return "";

  // If has spaces or uppercase, already a display name
  if (/[A-Z\s]/.test(idOrName)) {
    return idOrName;
  }

  // Convert kebab-case to title case with double-dash preservation
  // Split on double-dash first to preserve semantic separators
  const groups = idOrName.split("--");

  // Title-case each group
  const titleCasedGroups = groups.map((group) => {
    return group
      .split("-")
      .map((word) => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  });

  // Join groups with " - "
  return titleCasedGroups.join(" - ");
}
