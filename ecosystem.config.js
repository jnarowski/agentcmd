const fs = require('fs');
const path = require('path');

// Load .env file from project root (turbo uses this)
const envPath = path.join(__dirname, '.env');
const envConfig = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envConfig[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

module.exports = {
  apps: [
    {
      name: 'agent-workflows-web',
      script: 'pnpm',
      args: 'dev',
      cwd: '/Users/devbot/Dev/devbot/agent-workflows-monorepo-prod',
      interpreter: 'none',
      env: {
        ...envConfig,
        NODE_ENV: 'development',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
