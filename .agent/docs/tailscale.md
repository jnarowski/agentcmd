# Tailscale Setup

Quick reference for Tailscale Serve and Funnel with this app.

## 1. Installation

**macOS:**
```bash
brew install tailscale
```

**Start Tailscale:**
```bash
sudo tailscaled install-system-daemon
tailscale up
```

**Verify:**
```bash
tailscale status
```

## 2. Shell Alias (zsh)

Add to `~/.zshrc`:

```bash
# Tailscale shortcuts
alias ts='tailscale'
alias tss='tailscale status'
alias tsserve='tailscale serve status'
alias tsfunnel='tailscale funnel status'
```

Reload:
```bash
source ~/.zshrc
```

## 3. App Config Changes

**Edit `apps/app/.env`:**

```bash
# Bind to localhost only
HOST=127.0.0.1
PORT=3456

# CORS (optional - test without first)
ALLOWED_ORIGINS=https://your-machine-name.ts.net

# Webhooks (if using Funnel)
WEBHOOK_BASE_URL=https://your-machine-name.ts.net
```

Replace `your-machine-name` with output from `tailscale status`.

## 4. Running Serve

**Serve entire app (production mode):**

```bash
# Build app first
cd apps/app
pnpm build

# Start app
pnpm start  # or use PM2

# Serve via Tailscale (port 443)
tailscale serve --https=443 --bg localhost:3456
```

**Access:** `https://your-machine-name.ts.net`

**Serve dev server:**

```bash
# Start Vite
pnpm dev

# Serve via Tailscale
tailscale serve --https=443 --bg localhost:5173
```

**Status:**
```bash
tailscale serve status
```

**Stop:**
```bash
tailscale serve --https=443 off
```

## 5. Running Funnel

**Funnel = Public internet access** (Serve = tailnet only)

**Expose entire app:**

```bash
# Set up Serve first
tailscale serve --https=443 --bg localhost:3456

# Enable public access
tailscale funnel --bg 443 on
```

**Expose specific path (webhooks only):**

```bash
# Serve specific path
tailscale serve --https=443 --bg --set-path=/api/webhooks http://127.0.0.1:3456

# Enable Funnel
tailscale funnel --bg 443 on
```

**Status:**
```bash
tailscale funnel status
```

**Stop:**
```bash
tailscale funnel 443 off
```

## Auto-Start on Boot

**Tailscale Serve:**
```bash
# --bg flag persists across reboots
tailscale serve --https=443 --bg localhost:3456
```

**Your app (PM2):**
```bash
npm install -g pm2
cd apps/app
pm2 start dist/server/index.js --name agentcmd
pm2 save
pm2 startup  # Follow printed instructions
```

## Common Commands

```bash
# Get your hostname
tailscale status --json | jq -r '.Self.DNSName'

# Check what's running
tailscale serve status
tailscale funnel status

# Stop everything
tailscale serve off
tailscale funnel 443 off

# Logs (app)
tail -f apps/app/logs/app.log | jq .

# PM2
pm2 status
pm2 logs agentcmd
pm2 restart agentcmd
```

## Troubleshooting

**CORS errors:**
- Production (same origin): Shouldn't need `ALLOWED_ORIGINS`
- Dev mode: Add Tailscale domain to `ALLOWED_ORIGINS`

**WebSocket issues:**
- Production: Auto-detects wss:// (no config needed)
- Dev: Set `VITE_WS_HOST=your-machine-name.ts.net` in `.env`

**Can't access:**
```bash
# Check Tailscale running
tailscale status

# Check serve config
tailscale serve status

# Check app running
curl http://localhost:3456/api/health

# Check PM2
pm2 status
```

## See Also

- `.agent/docs/tailscale-funnel.md` - Detailed webhook/Funnel guide
- `.agent/docs/deployment.md` - Production deployment
