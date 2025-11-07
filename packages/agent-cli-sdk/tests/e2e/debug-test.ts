import { execute } from '../../src/claude/execute';

async function debug() {
  console.log('Testing basic execution...');
  const result = await execute({
    prompt: 'What is 2+2?',
    permissionMode: 'default',
    timeout: 60000,
    verbose: true,
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('\nSuccess:', result.success);
  console.log('Exit code:', result.exitCode);
  console.log('Error:', result.error);
  console.log('Messages count:', result.messages.length);
  console.log('Session ID:', result.sessionId);
}

debug().catch(console.error);
