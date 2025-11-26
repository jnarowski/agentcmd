# Deployment Guide

Guide to building, configuring, and deploying agentcmd.

## Production Build

### Build Process

```bash
# From root - builds all packages
pnpm build

# This runs:
# 1. Build packages (agent-cli-sdk, agentcmd-workflows)
# 2. Build app (client + server)
# 3. Generate Prisma client
```

**Output:**
- Client: `apps/app/dist/client/` (static assets)
- Server: `apps/app/dist/server/` (Node.js bundle)
- CLI: `apps/app/dist/cli/` (CLI distribution)

### Build Verification

```bash
# Type check
pnpm check-types

# Lint
pnpm check

# Test
pnpm test

# Build
pnpm build
```

## Environment Variables

### Required Variables

```bash
# JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here

# Database URL
DATABASE_URL=file:./prod.db
```

### Optional Variables

```bash
# Server configuration
PORT=4100
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

# AI API keys (for workflow features)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Inngest (for workflows)
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

### Environment File

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

**Security:**
- Never commit `.env` to git
- Use environment-specific secrets
- Rotate JWT_SECRET periodically
- Store API keys securely

## Database

### Production Migrations

```bash
# Apply all pending migrations
pnpm prisma migrate deploy

# This runs: prisma migrate deploy
# - Applies migrations only (no dev mode)
# - No prompts or client regeneration
# - Safe for production
```

**Deployment Flow:**
1. Push code with new migrations
2. Run `pnpm prisma migrate deploy`
3. Restart application

### Database Backup

```bash
# Backup SQLite database
cp apps/app/prisma/prod.db apps/app/prisma/prod.db.backup

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp apps/app/prisma/prod.db backups/prod_$DATE.db
```

### Database Location

**Development:**
- `apps/app/prisma/dev.db`

**Production:**
- Configure via `DATABASE_URL` in `.env`
- Recommended: `apps/app/prisma/prod.db`
- Or external PostgreSQL/MySQL

## Server Deployment

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start apps/app/dist/server/index.js --name agentcmd

# Configure auto-restart
pm2 startup
pm2 save

# Monitor
pm2 logs agentcmd
pm2 monit
```

**PM2 Ecosystem File:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "agentcmd",
    script: "./apps/app/dist/server/index.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 4100,
    },
  }],
};

// Start with:
pm2 start ecosystem.config.js
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Migrate database
RUN pnpm prisma migrate deploy

# Expose port
EXPOSE 4100

# Start server
CMD ["node", "apps/app/dist/server/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4100:4100"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/prod.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/data
      - ./logs:/app/apps/app/logs
    restart: unless-stopped
```

## CLI Distribution

### NPM Package

The CLI is distributed as `agentcmd` npm package.

**Usage:**
```bash
# Run without installing
npx agentcmd

# Or install globally
npm install -g agentcmd
agentcmd
```

**Package Structure:**
```
apps/app/
├── dist/
│   └── cli/
│       ├── index.js
│       └── package.json
├── package.json
└── scripts/
    └── build-cli.js
```

**Publishing:**
```bash
# Build CLI
pnpm build

# Publish to npm
cd apps/app/dist/cli
npm publish
```

## Static Assets

### Frontend Build

```bash
# Build frontend
cd apps/app
pnpm build:client

# Output: dist/client/
# - index.html
# - assets/ (JS, CSS, images)
```

### Serving Static Files

**Option 1: Fastify Static**
```typescript
// Server serves frontend
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client'),
  prefix: '/',
});

// SPA fallback
fastify.setNotFoundHandler((request, reply) => {
  reply.sendFile('index.html');
});
```

**Option 2: Nginx**
```nginx
server {
  listen 80;
  server_name agentcmd.example.com;

  # Frontend
  location / {
    root /var/www/agentcmd/client;
    try_files $uri $uri/ /index.html;
  }

  # API
  location /api {
    proxy_pass http://localhost:4100;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # WebSocket
  location /socket.io {
    proxy_pass http://localhost:4100;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

## Logging

### Production Logging

```bash
# Log location
apps/app/logs/app.log

# Log rotation with logrotate
# /etc/logrotate.d/agentcmd
/var/www/agentcmd/logs/app.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 www-data www-data
  sharedscripts
  postrotate
    pm2 reload agentcmd
  endscript
}
```

### Log Levels

```bash
# Set in .env
LOG_LEVEL=info  # trace, debug, info, warn, error, fatal
```

**Levels:**
- `trace`: Very detailed debugging
- `debug`: Debugging information
- `info`: General information (default)
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors

### Viewing Logs

```bash
# Tail logs
tail -f apps/app/logs/app.log | jq .

# Filter errors
tail -f apps/app/logs/app.log | jq 'select(.level >= 50)'

# Search
grep "error" apps/app/logs/app.log | jq .

# With PM2
pm2 logs agentcmd
```

## Health Checks

### Health Endpoint

```bash
# Check server health
curl http://localhost:4100/api/health

# Response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Monitoring

```bash
# Add to cron for monitoring
*/5 * * * * curl -f http://localhost:4100/api/health || systemctl restart agentcmd
```

## Performance

### Production Optimizations

**Vite Build:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

**Compression:**
```typescript
// Enable gzip
fastify.register(fastifyCompress);
```

**Caching:**
```nginx
# Nginx caching
location /assets {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

## Security

### HTTPS

```nginx
server {
  listen 443 ssl http2;
  server_name agentcmd.example.com;

  ssl_certificate /etc/letsencrypt/live/agentcmd.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/agentcmd.example.com/privkey.pem;

  # ... rest of config
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name agentcmd.example.com;
  return 301 https://$server_name$request_uri;
}
```

### Firewall

```bash
# UFW example
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### Rate Limiting

```typescript
// Fastify rate limit
fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Static assets built
- [ ] Server built and tested
- [ ] Logs configured
- [ ] Health checks working
- [ ] HTTPS configured
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backup strategy in place

## Quick Commands

```bash
# Full production build
pnpm build

# Apply migrations
pnpm prisma migrate deploy

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs agentcmd

# Health check
curl http://localhost:4100/api/health

# Backup database
cp apps/app/prisma/prod.db backups/prod_$(date +%Y%m%d).db
```

## Related Docs

- `.agent/docs/database-guide.md` - Database migrations
- `.agent/docs/troubleshooting.md` - Common issues
- Root `CLAUDE.md` - Environment variables
