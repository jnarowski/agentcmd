import { spawn } from 'child_process';

const PORT = process.env.PORT || '3456';
const HOST = process.env.HOST || '0.0.0.0';
const INNGEST_DEV_PORT = process.env.INNGEST_DEV_PORT || '8288';
const url = `http://${HOST}:${PORT}/api/workflows/inngest`;

console.log('Starting agentcmd server...');
console.log(`  Server: http://${HOST}:${PORT}`);
console.log(`  Inngest UI: http://${HOST}:${INNGEST_DEV_PORT}`);
console.log('');

// Start Fastify server
const server = spawn('node', ['--env-file=.env', 'dist/server/index.js'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

// Start Inngest dev server (immediately - built-in retry handles connection timing)
const inngest = spawn('npx', ['inngest-cli@latest', 'dev', '-u', url, '-p', INNGEST_DEV_PORT], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

// Handle graceful shutdown
const cleanup = () => {
  console.log('\nShutting down...');
  server.kill();
  inngest.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  inngest.kill();
  process.exit(code || 0);
});

inngest.on('exit', (code) => {
  console.log(`Inngest dev server exited with code ${code}`);
  server.kill();
  process.exit(code || 0);
});
