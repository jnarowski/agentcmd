import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

/**
 * Generate Inngest step ID with optional phase prefix
 *
 * @param context - Runtime context containing current phase
 * @param stepId - Base step identifier
 * @returns Phase-prefixed step ID if phase exists, otherwise returns stepId
 *
 * @example
 * ```typescript
 * // With phase
 * generateInngestStepId({ currentPhase: 'build', ... }, 'compile')
 * // Returns: 'build-compile'
 *
 * // Without phase
 * generateInngestStepId({ currentPhase: null, ... }, 'compile')
 * // Returns: 'compile'
 * ```
 */
export function generateInngestStepId(
  context: RuntimeContext,
  stepId: string
): string {
  return context.currentPhase ? `${context.currentPhase}-${stepId}` : stepId;
}
