import { spawn } from 'child_process';

const PORT = process.env.PORT || '3456';
const HOST = process.env.HOST || 'localhost';
const INNGEST_DEV_PORT = process.env.INNGEST_DEV_PORT || '8288';
const url = `http://${HOST}:${PORT}/api/workflows/inngest`;

console.log(`Starting Inngest Dev Server with URL: ${url}`);
console.log(`Inngest Dev UI will run on port: ${INNGEST_DEV_PORT}`);

// Start inngest-cli
const child = spawn('npx', ['inngest-cli@latest', 'dev', '-u', url, '-p', INNGEST_DEV_PORT], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
