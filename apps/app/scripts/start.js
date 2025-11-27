import { spawn } from 'child_process';
import { createWriteStream, mkdirSync } from 'fs';
import http from 'http';
import { join, dirname } from 'path';
import pc from 'picocolors';

// Ensure production mode
process.env.NODE_ENV = 'production';

// Parse flags
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

// Config
const PORT = process.env.PORT || '4100';
const HOST = process.env.HOST || '127.0.0.1';
const INNGEST_PORT = process.env.INNGEST_PORT || '8288';
const INNGEST_HOST = process.env.INNGEST_HOST || '127.0.0.1';
const LOG_PATH = join(process.cwd(), 'logs/app.log');
const DB_PATH = './prisma/dev.db';

// Brand color #06B6D4 as ANSI true color
const brandCyan = (text) => `\x1b[38;2;6;182;212m${text}\x1b[0m`;

// Configure Inngest environment
process.env.INNGEST_PORT = INNGEST_PORT;
process.env.INNGEST_BASE_URL = `http://${INNGEST_HOST}:${INNGEST_PORT}`;
// Don't set INNGEST_DEV in production mode

// Use localhost for Inngest connection (loopback for internal service-to-service)
const inngestUrl = `http://localhost:${PORT}/api/workflows/inngest`;

let server;
let inngest;
let logStream;

/**
 * Print styled startup banner
 */
function printStartupBanner({ port, inngestPort, dbPath, logPath, verbose }) {
  if (verbose) {
    console.log('');
    console.log('✓ Server running at http://localhost:' + port);
    console.log('✓ Inngest Dev UI at http://localhost:' + inngestPort);
    console.log('');
    console.log('Press Ctrl+C to stop');
    return;
  }

  console.log('');
  console.log(pc.bold(brandCyan('agentcmd')) + pc.dim(' ready'));
  console.log('');
  console.log(pc.green('✓') + ' Server     ' + brandCyan(`http://localhost:${port}`));
  console.log(pc.green('✓') + ' Inngest    ' + brandCyan(`http://localhost:${inngestPort}`));
  console.log(pc.green('✓') + ' Database   ' + pc.dim(dbPath));
  console.log(pc.green('✓') + ' Logs       ' + pc.dim(logPath));
  console.log('');
  console.log(pc.dim('Press Ctrl+C to stop'));
}

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
    // Create log stream for non-verbose mode
    if (!verbose) {
      mkdirSync(dirname(LOG_PATH), { recursive: true });
      logStream = createWriteStream(LOG_PATH, { flags: 'a' });
      console.log(pc.dim('Starting server...'));
    }

    // 1. Start Fastify server
    if (verbose) console.log('Starting Fastify server...');
    server = spawn('node', ['--env-file=.env', 'dist/server/index.js'], {
      stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, NODE_ENV: 'production' },
    });

    // Pipe server output to log file when not verbose
    if (!verbose && server.stdout) {
      server.stdout.pipe(logStream);
      server.stderr?.pipe(logStream);
    }

    // 2. Wait for server to be ready
    if (verbose) console.log('Waiting for server to be ready...');
    await waitForServerReady(`http://localhost:${PORT}/api/health`, { timeout: 30000 });
    if (verbose) console.log('✓ Server is ready\n');

    // 3. Start Inngest dev server
    if (verbose) console.log('Starting Inngest dev server...');
    if (!verbose) console.log(pc.dim('Starting workflow engine...'));
    inngest = spawn('npx', ['inngest-cli@latest', 'dev', '-u', inngestUrl, '-p', INNGEST_PORT], {
      stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env },
    });

    // Pipe inngest output to log file when not verbose
    if (!verbose && inngest.stdout) {
      inngest.stdout.pipe(logStream);
      inngest.stderr?.pipe(logStream);
    }

    // Give Inngest a moment to start, then show banner
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Print startup banner
    printStartupBanner({
      port: PORT,
      inngestPort: INNGEST_PORT,
      dbPath: DB_PATH,
      logPath: LOG_PATH,
      verbose
    });

    // Handle graceful shutdown
    const cleanup = () => {
      if (!verbose) console.log('');
      console.log(pc.dim('Shutting down...'));
      if (server) server.kill();
      if (inngest) inngest.kill();
      if (logStream) logStream.end();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    server.on('exit', (code) => {
      if (verbose) console.log(`Server exited with code ${code}`);
      if (inngest) inngest.kill();
      if (logStream) logStream.end();
      process.exit(code || 0);
    });

    inngest.on('exit', (code) => {
      if (verbose) console.log(`Inngest dev server exited with code ${code}`);
      if (server) server.kill();
      if (logStream) logStream.end();
      process.exit(code || 0);
    });
  } catch (error) {
    console.error(pc.red('Failed to start:'), error.message);
    if (server) server.kill();
    if (inngest) inngest.kill();
    if (logStream) logStream.end();
    process.exit(1);
  }
})();
