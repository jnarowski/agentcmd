#!/usr/bin/env tsx
/**
 * Example demonstrating different permission modes in Codex
 * Shows how to control file operations and command execution safety
 */

import { execute } from '../../src/index';

async function main() {
  console.log('=== Permission Modes Example ===\n');

  // Mode 1: Default (workspace-write sandbox)
  console.log('Mode 1: Default (workspace-write sandbox)...\n');
  const result1 = await execute({
    tool: 'codex',
    prompt: 'What is the current directory?',
    permissionMode: 'default',
    verbose: false,
  });
  console.log('Response:', result1.data);
  console.log('Success:', result1.success);

  // Mode 2: Plan mode (read-only)
  console.log('\n\nMode 2: Plan mode (read-only)...\n');
  const result2 = await execute({
    tool: 'codex',
    prompt: 'Analyze the structure of the src directory and suggest improvements',
    permissionMode: 'plan',
    verbose: false,
  });
  console.log('Response:', result2.data.substring(0, 200) + '...');
  console.log('Success:', result2.success);

  // Mode 3: Accept edits (full-auto for file operations)
  console.log('\n\nMode 3: Accept edits (full-auto)...\n');
  const result3 = await execute({
    tool: 'codex',
    prompt: 'Create a temporary file named test-codex.txt with the content "Hello from Codex"',
    permissionMode: 'acceptEdits',
    verbose: false,
  });
  console.log('Response:', result3.data);
  console.log('Success:', result3.success);

  // Mode 4: Bypass permissions (DANGEROUS - use only in isolated environments)
  console.log('\n\nMode 4: Bypass permissions (DANGEROUS)...\n');
  console.log('WARNING: This mode bypasses all safety checks!');
  console.log('Only use in isolated/sandboxed environments.\n');

  const result4 = await execute({
    tool: 'codex',
    prompt: 'What files are in this directory?',
    dangerouslySkipPermissions: true,
    verbose: false,
  });
  console.log('Response:', result4.data.substring(0, 200) + '...');
  console.log('Success:', result4.success);

  console.log('\n\n=== Summary ===');
  console.log('Default mode: Standard workspace-write sandbox');
  console.log('Plan mode: Read-only analysis, no modifications');
  console.log('Accept edits: Auto-accepts file changes');
  console.log('Bypass permissions: Disables all safety checks (use with extreme caution)');
}

main().catch(console.error);
