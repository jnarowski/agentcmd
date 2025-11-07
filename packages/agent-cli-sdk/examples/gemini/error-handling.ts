#!/usr/bin/env tsx
/**
 * Example of error handling with the Gemini CLI
 * Demonstrates:
 * - Basic error detection (result.success, result.error, result.exitCode)
 * - Timeout handling with partial data recovery
 * - Error monitoring callbacks (onError, onStderr, onClose)
 * - CLI detection errors (the one case that throws)
 * - Quota exceeded errors (rate limiting)
 */

import { execute } from '../../src/index';

async function main() {
  console.log('=== Error Handling Example for Gemini ===\n');

  // Example 1: Normal execution with error callbacks
  console.log('Example 1: Normal execution with monitoring callbacks\n');

  const result1 = await execute({
    tool: 'gemini',
    prompt: 'What directory are we in right now?',
    verbose: false,
    onError: (error: Error) => {
      console.log('[onError callback]:', error.message);
    },
    onStderr: (chunk: string) => {
      // Stderr may contain warnings or errors
      if (chunk.length > 0) {
        console.log('[onStderr callback]:', chunk.substring(0, 100));
      }
    },
    onClose: (exitCode: number) => {
      console.log('[onClose callback]: Process closed with code', exitCode);
    },
  });

  console.log('\nResult:');
  console.log('Success:', result1.success);
  console.log('Exit code:', result1.exitCode);
  console.log('Error:', result1.error || 'none');
  console.log('Response:', result1.data);

  // Example 2: Handling quota exceeded errors
  console.log('\n\nExample 2: Handling quota exceeded errors\n');

  const result2 = await execute({
    tool: 'gemini',
    prompt: 'Say hello',
    verbose: false,
  });

  if (!result2.success && result2.error?.includes('Quota exceeded')) {
    console.log('⚠️  Gemini API quota exceeded. Please try again later.');
    console.log('Error details:', result2.error);
  } else if (result2.success) {
    console.log('✓ Execution successful');
    console.log('Response:', result2.data);
  } else {
    console.log('✗ Execution failed');
    console.log('Error:', result2.error);
  }

  // Example 3: Timeout handling
  console.log('\n\nExample 3: Short timeout (will likely fail)\n');

  const result3 = await execute({
    tool: 'gemini',
    prompt: 'Count all TypeScript files in this project',
    timeout: 5000, // Very short timeout - 5 seconds
    verbose: false,
  });

  console.log('Success:', result3.success);
  console.log('Exit code:', result3.exitCode);
  console.log('Duration:', result3.duration, 'ms');

  if (!result3.success) {
    console.log('Error:', result3.error);

    // Even on timeout/error, we may have partial data
    if (result3.data) {
      console.log('Partial data recovered:', result3.data.substring(0, 200));
    }
  }

  console.log('\n=== Summary ===');
  console.log('All error handling examples completed');
  console.log('Note: Gemini does NOT support session resumption');
  console.log('Each execution creates a new, independent session');
}

main().catch((error) => {
  // The only error that throws is CLI detection failure
  if (error.message.includes('Gemini CLI not found')) {
    console.error('Error: Gemini CLI is not installed or not in PATH');
    console.error('Set GEMINI_CLI_PATH environment variable or install Gemini CLI');
  } else {
    console.error('Unexpected error:', error);
  }
});
