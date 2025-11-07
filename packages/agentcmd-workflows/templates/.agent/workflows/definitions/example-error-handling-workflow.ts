import { defineWorkflow } from '@repo/workflow-sdk';

/**
 * Error handling workflow example demonstrating Result pattern
 *
 * Best practices:
 * - Use Result<T, E> for operations that can fail
 * - Handle errors explicitly
 * - Provide graceful fallbacks
 * - Log errors with context
 */
export const errorHandlingWorkflow = defineWorkflow({
  name: 'error-handling-workflow',
  description: 'Demonstrates proper error handling patterns',

  async execute({ step, logger, config }) {
    // Step 1: Operation that might fail
    const fileResult = await step({
      name: 'read-file',
      execute: async () => {
        try {
          // Simulated file operation
          const content = 'file content';
          logger.info('File read successfully');
          return { ok: true, data: content };
        } catch (error) {
          logger.error('Failed to read file', { error });
          return { ok: false, error: error.message };
        }
      },
    });

    // Step 2: Handle result
    if (!fileResult.ok) {
      logger.warn('Using fallback due to file read error');

      await step({
        name: 'use-fallback',
        execute: async () => {
          logger.info('Using default content');
          return { content: 'default content' };
        },
      });
    }

    // Step 3: Process with validation
    await step({
      name: 'process-with-validation',
      execute: async () => {
        const content = fileResult.ok ? fileResult.data : 'default';

        // Validate before processing
        if (!content) {
          throw new Error('Content is required');
        }

        logger.info('Processing content', { length: content.length });
        return { processed: true };
      },
    });

    // Step 4: Cleanup (always runs)
    await step({
      name: 'cleanup',
      execute: async () => {
        logger.info('Cleaning up resources');
        return { cleaned: true };
      },
    });

    return { success: true };
  },
});
