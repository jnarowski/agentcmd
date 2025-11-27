import { spawn } from 'child_process';
import http from 'http';

const PORT = process.env.PORT || '4100';
const HOST = process.env.HOST || '127.0.0.1';
const INNGEST_PORT = process.env.INNGEST_PORT || '8288';
const INNGEST_HOST = process.env.INNGEST_HOST || '127.0.0.1';

// Configure Inngest environment
process.env.INNGEST_PORT = INNGEST_PORT;
process.env.INNGEST_BASE_URL = `http://${INNGEST_HOST}:${INNGEST_PORT}`;
if (!process.env.INNGEST_DEV) {
  process.env.INNGEST_DEV = '1';
}

// Use localhost for Inngest connection (loopback for internal service-to-service)
const inngestUrl = `http://localhost:${PORT}/api/workflows/inngest`;

console.log('Starting agentcmd server...');
console.log(`  Server: http://${HOST}:${PORT}`);
console.log(`  Inngest UI: http://${INNGEST_HOST}:${INNGEST_PORT}`);
console.log('');

let server;
let inngest;

/**
 * Wait for server to be ready by polling health endpoint
 */
async function waitForServerReady(url, options = {}) {
  const { timeout = 30000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Health check returned ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('Health check timeout'));
        });
      });
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  throw new Error(`Server did not become ready within ${timeout}ms`);
}

// Main startup sequence (sequential)
(async () => {
  try {
    // 1. Start Fastify server
    console.log('Starting Fastify server...');
    server = spawn('node', ['--env-file=.env', 'dist/server/index.js'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'production' },
    });

    // 2. Wait for server to be ready
    console.log('Waiting for server to be ready...');
    await waitForServerReady(`http://localhost:${PORT}/api/health`, { timeout: 30000 });
    console.log('✓ Server is ready');
    console.log('');

    // 3. Start Inngest dev server
    console.log('Starting Inngest dev server...');
    inngest = spawn('npx', ['inngest-cli@latest', 'dev', '-u', inngestUrl, '-p', INNGEST_PORT], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env },
    });

    // Handle graceful shutdown
    const cleanup = () => {
      console.log('\nShutting down...');
      if (server) server.kill();
      if (inngest) inngest.kill();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    server.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      if (inngest) inngest.kill();
      process.exit(code || 0);
    });

    inngest.on('exit', (code) => {
      console.log(`Inngest dev server exited with code ${code}`);
      if (server) server.kill();
      process.exit(code || 0);
    });
  } catch (error) {
    console.error('Failed to start:', error.message);
    if (server) server.kill();
    if (inngest) inngest.kill();
    process.exit(1);
  }
})();
