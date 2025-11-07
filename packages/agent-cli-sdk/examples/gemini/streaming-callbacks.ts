#!/usr/bin/env tsx
/**
 * Example of using execute() with streaming callbacks
 * Shows real-time stdout/stderr monitoring as Gemini responds
 *
 * Note: Gemini CLI outputs in stream-json format but doesn't emit
 * message events in the same way as Claude. This example focuses
 * on stdout/stderr streaming.
 */

import { execute } from '../../src/index';

async function main() {
  console.log('Running Gemini command with streaming callbacks...\n');

  let stdoutChunks = 0;
  let stderrChunks = 0;

  const result = await execute({
    tool: 'gemini',
    prompt: 'Count the number of TypeScript files in the src directory',
    verbose: false,
    onStdout: (chunk) => {
      stdoutChunks++;
      // Show first 100 chars of each chunk
      const preview = chunk.substring(0, 100);
      console.log(`[stdout chunk ${stdoutChunks}]: ${preview}${chunk.length > 100 ? '...' : ''}`);
    },
    onStderr: (chunk) => {
      stderrChunks++;
      console.log(`[stderr chunk ${stderrChunks}]: ${chunk}`);
    },
    onError: (error) => {
      console.error('[Error]:', error.message);
    },
    onClose: (exitCode) => {
      console.log(`[Close]: Process exited with code ${exitCode}`);
    },
  });

  console.log('\n=== Summary ===');
  console.log('Stdout chunks received:', stdoutChunks);
  console.log('Stderr chunks received:', stderrChunks);
  console.log('Success:', result.success);
  console.log('Exit code:', result.exitCode);
  console.log('Duration:', result.duration, 'ms');
  console.log('\nFinal response:');
  console.log(result.data);
}

main().catch(console.error);
