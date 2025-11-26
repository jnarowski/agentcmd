import type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowFunction,
  PhaseDefinition,
} from "../types/workflow";
import type { WorkflowRuntime } from "../runtime/adapter";
import type { InferSchemaType } from "../types/schema";

/**
 * Workflow definition with type marker for runtime detection
 */
export interface WorkflowDefinition<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined,
  TArgsSchema extends Record<string, unknown> = Record<string, unknown>
> {
  __type: "workflow";
  config: WorkflowConfig<TPhases, TArgsSchema>;
  fn: WorkflowFunction<TPhases, Record<string, unknown>>;
  /**
   * Create an Inngest function using the provided runtime adapter
   * This is called by the web app to hydrate the workflow with real implementations
   */
  createInngestFunction(runtime: WorkflowRuntime): any;
}

/**
 * Define a type-safe workflow
 *
 * argsSchema provides both runtime validation and automatic type inference.
 * event.data.args is automatically typed based on the schema definition.
 * Use standard TypeScript closures for shared context across phase callbacks.
 *
 * @param config - Workflow configuration
 * @param fn - Workflow function to execute
 * @returns Workflow definition with createInngestFunction method
 *
 * @example
 * ```typescript
 * import { defineWorkflow, defineSchema } from 'agentcmd-workflows';
 *
 * interface MyContext {
 *   specFile?: string;
 * }
 *
 * const argsSchema = defineSchema({
 *   type: 'object',
 *   properties: {
 *     featureName: { type: 'string' },
 *     priority: { enum: ['high', 'medium', 'low'] },
 *     tags: { type: 'array', items: { type: 'string' } }
 *   },
 *   required: ['featureName', 'priority']
 * });
 *
 * export default defineWorkflow({
 *   id: 'implement-feature',
 *   phases: [{ id: 'plan', label: 'Plan' }] as const,
 *   argsSchema
 * }, async ({ event, step }) => {
 *   const { featureName, priority, tags } = event.data.args; // Fully typed!
 *   const ctx: MyContext = {};  // Manual context via closure
 *
 *   await step.phase("plan", async () => {
 *     ctx.specFile = "..."; // Type-safe context access!
 *   });
 * });
 * ```
 */
export function defineWorkflow<
  const TPhases extends readonly PhaseDefinition[] | undefined = undefined,
  const TArgsSchema extends Record<string, unknown> = Record<string, unknown>
>(
  config: WorkflowConfig<TPhases, TArgsSchema>,
  fn: WorkflowFunction<TPhases, InferSchemaType<TArgsSchema>>
): WorkflowDefinition<TPhases, TArgsSchema> {
  return {
    __type: "workflow",
    config,
    // Type erasure: cast to untyped function for runtime compatibility
    fn: fn as WorkflowFunction<TPhases, Record<string, unknown>>,
    createInngestFunction(runtime: WorkflowRuntime): any {
      // This will be called by the web app with the runtime adapter
      // The runtime adapter provides the actual implementations of step methods
      return runtime.createInngestFunction(config, fn as any);
    },
  };
}
