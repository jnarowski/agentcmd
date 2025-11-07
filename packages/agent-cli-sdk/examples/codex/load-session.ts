#!/usr/bin/env tsx
/**
 * Example of loading and inspecting a Codex session history
 * Demonstrates how to read session files and analyze the conversation
 */

import { loadMessages, execute } from '../../src/index';

async function main() {
  console.log('=== Load Session Example ===\n');

  // Step 1: Create a new session
  console.log('Step 1: Creating a new session...\n');

  const result = await execute({
    tool: 'codex',
    prompt: 'List the TypeScript files in the src directory',
    verbose: false,
  });

  console.log('Session created with ID:', result.sessionId);
  console.log('Messages in session:', result.messages.length);
  console.log('Response:', result.data.substring(0, 100) + '...\n');

  // Step 2: Load the session using the session ID
  console.log('Step 2: Loading the session from disk...\n');

  try {
    const messages = await loadMessages({
      tool: 'codex',
      sessionId: result.sessionId,
    });

    console.log('Loaded', messages.length, 'messages from session\n');

    // Step 3: Analyze the session
    console.log('Step 3: Analyzing session contents...\n');

    messages.forEach((msg, index) => {
      console.log(`\nMessage ${index + 1}:`);
      console.log('  Role:', msg.role);
      console.log('  Timestamp:', msg.timestamp);

      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        msg.content.forEach((block) => {
          if (block.type === 'text') {
            console.log('  Text:', block.text.substring(0, 80) + '...');
          } else if (block.type === 'tool_use') {
            console.log('  Tool:', block.name);
            console.log('  Tool ID:', block.id);
          } else if (block.type === 'thinking') {
            console.log('  Thinking:', block.thinking.substring(0, 80) + '...');
          }
        });
      } else if (msg.role === 'tool') {
        console.log('  Tool use ID:', msg.tool_use_id);
        if (typeof msg.content === 'string') {
          console.log('  Result:', msg.content.substring(0, 80) + '...');
        }
      }
    });

    // Step 4: Count tools used
    const toolUses = messages.filter(
      (m) =>
        m.role === 'assistant' &&
        Array.isArray(m.content) &&
        m.content.some((b) => b.type === 'tool_use')
    );

    console.log('\n\n=== Session Statistics ===');
    console.log('Total messages:', messages.length);
    console.log('Messages with tool uses:', toolUses.length);
    console.log('Session duration:', messages.length > 0 ?
      new Date(messages[messages.length - 1].timestamp).getTime() -
      new Date(messages[0].timestamp).getTime() : 0, 'ms');

  } catch (error) {
    console.error('Failed to load session:', error);
    console.log('\nNote: Codex sessions are stored in ~/.codex/sessions/YYYY/MM/DD/');
    console.log('Session files follow the pattern: rollout-{timestamp}-{uuid}.jsonl');
  }
}

main().catch(console.error);
