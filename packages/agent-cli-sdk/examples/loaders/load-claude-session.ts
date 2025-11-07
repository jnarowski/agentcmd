#!/usr/bin/env node
import { loadMessages } from '../../src/index';

/**
 * Example: Load Claude session messages
 *
 * This example demonstrates how to load messages from a Claude CLI session using
 * the public API. Messages are loaded from the session's JSONL file and parsed
 * into a unified format.
 *
 * Usage:
 *   pnpm tsx examples/loaders/load-claude-session.ts <sessionId> <projectPath>
 *
 * Example:
 *   pnpm tsx examples/loaders/load-claude-session.ts cfa1e878-62b5-4e40-b281-bbf9b250d766 /Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2
 */

async function main() {
  const [sessionId, projectPath] = process.argv.slice(2);

  if (!sessionId || !projectPath) {
    console.error('Usage: tsx examples/loaders/load-claude-session.ts <sessionId> <projectPath>');
    console.error('');
    console.error('Example:');
    console.error(
      '  tsx examples/loaders/load-claude-session.ts cfa1e878-62b5-4e40-b281-bbf9b250d766 /Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2'
    );
    process.exit(1);
  }

  console.log('Loading Claude session...');
  console.log('Session ID:', sessionId);
  console.log('Project Path:', projectPath);
  console.log('');

  try {
    const messages = await loadMessages({
      tool: 'claude',
      sessionId,
      projectPath,
    });

    console.log(`✓ Loaded ${messages.length} messages`);
    console.log('');

    if (messages.length === 0) {
      console.log('No messages found. The session file may not exist yet.');
      return;
    }

    // Display summary
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    console.log('Summary:');
    console.log('  User messages:', userMessages.length);
    console.log('  Assistant messages:', assistantMessages.length);
    console.log('  Total messages:', messages.length);
    console.log('');

    // Display first few messages
    console.log('First 3 messages:');
    messages.slice(0, 3).forEach((msg, index) => {
      console.log(`\n[${index + 1}] ${msg.role} (${new Date(msg.timestamp).toISOString()})`);
      const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      console.log('  Content:', contentStr.substring(0, 100) + (contentStr.length > 100 ? '...' : ''));
    });

    console.log('');
    console.log('Full message data (JSON):');
    console.log(JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('Error loading session:', error);
    process.exit(1);
  }
}

main();
