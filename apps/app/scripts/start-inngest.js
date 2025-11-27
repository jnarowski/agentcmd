import { spawn, execSync } from 'child_process';

const PORT = process.env.PORT || '4100';
const HOST = process.env.HOST || '127.0.0.1';
const INNGEST_PORT = process.env.INNGEST_PORT || '8288';
const INNGEST_HOST = process.env.INNGEST_HOST || '127.0.0.1';
const isProduction = process.env.NODE_ENV === 'production';

// Configure Inngest environment (before SDK imports)
process.env.INNGEST_PORT = INNGEST_PORT;
process.env.INNGEST_BASE_URL = `http://${INNGEST_HOST}:${INNGEST_PORT}`;
if (!isProduction && !process.env.INNGEST_DEV) {
  process.env.INNGEST_DEV = '1';
}

const url = `http://${HOST}:${PORT}/api/workflows/inngest`;

let args;
if (isProduction) {
  // Production mode: use inngest start with event/signing keys
  const eventKey = process.env.INNGEST_EVENT_KEY || 'local-prod-key';
  let signingKey = process.env.INNGEST_SIGNING_KEY;

  if (!signingKey) {
    try {
      signingKey = execSync('openssl rand -hex 32', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error('Failed to generate signing key, using fallback');
      signingKey = 'a'.repeat(64); // Fallback: valid 64-char hex
    }
  }

  console.log(`Starting Inngest Server (persistent mode)`);
  console.log(`Inngest UI will run on port: ${INNGEST_PORT}`);

  args = ['inngest-cli@latest', 'start', '--event-key', eventKey, '--signing-key', signingKey, '--port', INNGEST_PORT];
} else {
  // Development mode: use inngest dev
  console.log(`Starting Inngest Dev Server with URL: ${url}`);
  console.log(`Inngest Dev UI will run on port: ${INNGEST_PORT}`);

  args = ['inngest-cli@latest', 'dev', '-u', url];
}

// Start inngest-cli
const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
