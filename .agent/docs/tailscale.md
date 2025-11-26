# Tailscale Setup

Quick reference for Tailscale Serve and Funnel with this app.

## 1. Installation

**macOS (recommended):**

Download and install [Tailscale for Mac](https://tailscale.com/download/mac).

**Verify:**
```bash
tailscale status
```

## 2. Shell Alias (macOS app users)

Add to `~/.zshrc`:

```bash
alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
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
PORT=4100

# CORS (optional - test without first)
ALLOWED_ORIGINS=https://your-machine-name.ts.net

# Webhooks (if using Funnel)
WEBHOOK_BASE_URL=https://your-machine-name.ts.net
```

Replace `your-machine-name` with output from `tailscale status`.

## 4. Running Serve

```bash
# Build app first
cd apps/app
pnpm build

# Start app
pnpm start  # or use PM2

# Serve via Tailscale (port 443)
tailscale serve --https=443 --bg localhost:4100
```

**Access:** `https://your-machine-name.ts.net`

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
tailscale serve --https=443 --bg localhost:4100

# Enable public access
tailscale funnel --bg 443 on
```

**Expose specific path (webhooks only):**

```bash
# Serve specific path
tailscale serve --https=443 --bg --set-path=/api/webhooks http://127.0.0.1:4100

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
tailscale serve --https=443 --bg localhost:4100
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
- Same origin requests shouldn't need `ALLOWED_ORIGINS`
- If issues, add Tailscale domain to `ALLOWED_ORIGINS`

**WebSocket issues:**
- Auto-detects wss:// protocol (no config needed)

**Can't access:**
```bash
# Check Tailscale running
tailscale status

# Check serve config
tailscale serve status

# Check app running
curl http://localhost:4100/api/health

# Check PM2
pm2 status
```

## See Also

- `.agent/docs/tailscale-funnel.md` - Detailed webhook/Funnel guide
- `.agent/docs/deployment.md` - Production deployment
