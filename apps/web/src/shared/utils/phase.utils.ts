import type { PhaseDefinition } from '@repo/workflow-sdk';

/**
 * Extract phase ID from PhaseDefinition
 *
 * Phase IDs are used for:
 * - Filtering steps/events/artifacts by phase
 * - Matching execution.current_phase
 * - Grouping executions by phase
 * - Database storage (all phase columns store IDs)
 *
 * @param phase - Phase definition (string or object)
 * @returns Phase ID (lowercase, no spaces)
 *
 * @example
 * // Simple string phase
 * getPhaseId("research") // => "research"
 *
 * @example
 * // Object phase with label
 * getPhaseId({ id: "research", label: "Research & Planning" }) // => "research"
 */
export function getPhaseId(phase: PhaseDefinition): string {
  return typeof phase === 'string' ? phase : phase.id;
}

/**
 * Extract phase label from PhaseDefinition
 *
 * Phase labels are used for:
 * - Display in UI components (headers, cards, timelines)
 * - User-facing messages and notifications
 *
 * Never use labels for filtering, matching, or database operations.
 *
 * @param phase - Phase definition (string or object)
 * @returns Phase label for display (may contain spaces, capitals, special chars)
 *
 * @example
 * // Simple string phase
 * getPhaseLabel("research") // => "research"
 *
 * @example
 * // Object phase with label
 * getPhaseLabel({ id: "research", label: "Research & Planning" }) // => "Research & Planning"
 */
export function getPhaseLabel(phase: PhaseDefinition): string {
  return typeof phase === 'string' ? phase : phase.label;
}
