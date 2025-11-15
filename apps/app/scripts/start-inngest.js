import { spawn } from 'child_process';

const PORT = process.env.PORT || '3456';
const HOST = process.env.HOST || 'localhost';
const INNGEST_PORT = process.env.INNGEST_PORT || '8288';
const INNGEST_HOST = process.env.INNGEST_HOST || '127.0.0.1'; // Always localhost for connections

// Configure Inngest environment (before SDK imports)
process.env.INNGEST_PORT = INNGEST_PORT;
process.env.INNGEST_BASE_URL = `http://${INNGEST_HOST}:${INNGEST_PORT}`;
if (!process.env.INNGEST_DEV) {
  process.env.INNGEST_DEV = '1';
}

const url = `http://${HOST}:${PORT}/api/workflows/inngest`;

console.log(`Starting Inngest Dev Server with URL: ${url}`);
console.log(`Inngest Dev UI will run on port: ${INNGEST_PORT}`);

// Start inngest-cli (uses INNGEST_PORT env var)
const child = spawn('npx', ['inngest-cli@latest', 'dev', '-u', url], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
