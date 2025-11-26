/**
 * Example: Typed workflow arguments using JSON Schema
 *
 * This example demonstrates how to use argsSchema for runtime validation
 * and manual type casting for compile-time type safety.
 */

import { defineWorkflow } from '../builder/defineWorkflow';

// Define TypeScript interface for args
interface FeatureArgs {
  featureName: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours?: number;
  tags?: string[];
}

export const typedFeatureWorkflow = defineWorkflow(
  {
    id: 'typed-feature-workflow',
    name: 'Feature Implementation with Typed Args',
    description: 'Demonstrates type-safe workflow arguments with runtime validation',
    // argsSchema enables runtime validation
    argsSchema: {
      type: 'object',
      properties: {
        featureName: { type: 'string' },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low']
        },
        estimatedHours: { type: 'number' },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['featureName', 'priority']
    }
  },
  async ({ event, step }) => {
    // Cast to your interface for type safety
    // Runtime validation ensures this cast is safe
    const { featureName, priority, estimatedHours, tags } = event.data.args as unknown as FeatureArgs;

    await step.agent('analyze-requirements', {
      agent: 'claude',
      prompt: `Analyze requirements for: ${featureName}
Priority: ${priority}
Estimated Hours: ${estimatedHours ?? 'Not specified'}
Tags: ${tags?.join(', ') ?? 'None'}`
    });

    if (priority === 'high') {
      await step.agent('urgent-implementation', {
        agent: 'claude',
        prompt: `URGENT: Implement ${featureName} immediately`
      });
    } else {
      await step.agent('normal-implementation', {
        agent: 'claude',
        prompt: `Implement ${featureName}`
      });
    }

    await step.agent('run-tests', {
      agent: 'claude',
      prompt: `Test implementation of ${featureName}`
    });

    return {
      success: true,
      feature: featureName,
      priority
    };
  }
);

// Example without argsSchema (backward compatibility)
export const untypedWorkflow = defineWorkflow(
  {
    id: 'untyped-workflow',
    name: 'Workflow without Args Schema'
  },
  async ({ event }) => {
    // args is Record<string, unknown> - no runtime validation
    const args = event.data.args;

    // You'd need to manually validate/cast
    const featureName = args.featureName as string;

    return { featureName };
  }
);
