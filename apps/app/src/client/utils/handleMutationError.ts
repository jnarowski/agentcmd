import { toast } from "sonner";

/**
 * Standardized mutation error handler
 * Displays error toast with custom context message
 *
 * @param error - Error from mutation
 * @param context - Optional custom error message context
 *
 * @example
 * ```typescript
 * useMutation({
 *   mutationFn: createWorkflow,
 *   onError: (error) => handleMutationError(error, "Failed to create workflow"),
 * });
 * ```
 */
export function handleMutationError(error: unknown, context?: string): void {
  const message =
    error instanceof Error ? error.message : context || "Operation failed";
  toast.error(message);
}
