# Tailscale Funnel for Webhooks

Guide for exposing webhook endpoints publicly using Tailscale Funnel.

## Overview

**Tailscale Funnel** exposes local services to the public internet through your Tailscale network. Perfect for receiving webhooks from external services (GitHub, Linear, Jira) without deploying to production.

**Key Features:**
- Automatic HTTPS with valid certificates
- Path-level access control
- No port forwarding or firewall configuration
- Free on personal Tailscale accounts

**Security Model:**
- Only expose specific paths (webhook event endpoint)
- Keep management endpoints private (require JWT auth)
- Signature verification on all webhook events
- Rate limiting (100 req/min per webhook)

## Quick Start

### 1. Start Server

```bash
# From apps/app/
pnpm dev:server

# Server runs on http://localhost:4100
```

### 2. Expose Webhook Endpoint

```bash
# Expose only the webhook event endpoint
tailscale serve --bg --https=443 --set-path=/api/webhooks http://127.0.0.1:4100

# Enable public access
tailscale funnel --bg 443 on
```

### 3. Get Your Public URL

```bash
tailscale status

# Or get just the URL:
tailscale status --json | jq -r '.Self.DNSName'
```

Your public URL: `https://<machine-name>.<tailnet-name>.ts.net`

### 4. Test It

```bash
# Should work - webhook event endpoint
curl -X POST https://<your-url>/api/webhooks/test-webhook-id/events \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Should fail (404) - management endpoint blocked
curl https://<your-url>/api/webhooks/test-webhook-id
```

## Configuration

### Path-Restricted Config

Create `tailscale-serve.json` to expose only webhook event endpoint:

```json
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "${TS_CERT_DOMAIN}:443": {
      "Handlers": {
        "/api/webhooks/": {
          "Proxy": "http://127.0.0.1:4100"
        }
      }
    }
  }
}
```

**Apply config:**

```bash
tailscale serve --serve-config=tailscale-serve.json
tailscale funnel 443 on
```

**Note:** This exposes ALL `/api/webhooks/*` paths. For production, restrict to only `/api/webhooks/*/events`:

```json
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "${TS_CERT_DOMAIN}:443": {
      "Handlers": {
        "/api/webhooks/([^/]+)/events": {
          "Proxy": "http://127.0.0.1:4100"
        }
      }
    }
  }
}
```

### Environment-Specific Configs

**Development:**

```bash
# Simple - expose all webhook paths
tailscale serve --bg --https=443 --set-path=/api/webhooks http://127.0.0.1:4100
tailscale funnel --bg 443 on
```

**Production:**

Use config file with regex path restriction (see above) + monitoring.

## Webhook Setup

### Public Endpoint (No Auth)

**POST** `/api/webhooks/:webhookId/events`

- Receives webhook payloads from external services
- Rate limited: 100 requests/minute per webhook ID
- Signature verification required (HMAC)
- Always returns 200 (errors logged internally)

**Public URL Format:**

```
https://<machine-name>.<tailnet-name>.ts.net/api/webhooks/{webhookId}/events
```

### Private Endpoints (JWT Auth Required)

These should NEVER be exposed via Funnel:

- `POST /api/projects/:projectId/webhooks` - Create webhook
- `GET /api/projects/:projectId/webhooks` - List webhooks
- `GET /api/webhooks/:webhookId` - Get webhook details
- `PATCH /api/webhooks/:webhookId` - Update webhook
- `DELETE /api/webhooks/:webhookId` - Delete webhook
- `POST /api/webhooks/:webhookId/activate` - Activate
- `POST /api/webhooks/:webhookId/pause` - Pause
- `POST /api/webhooks/:webhookId/rotate-secret` - Rotate secret
- `GET /api/webhooks/:webhookId/events` - Get event history

Access these via `http://localhost:4100` or Tailscale (non-Funnel).

### Supported Webhook Sources

**GitHub:**
- Header: `X-Hub-Signature-256`
- Algorithm: HMAC-SHA256

**Linear:**
- Header: `Linear-Signature`
- Algorithm: HMAC-SHA256

**Jira:**
- Custom signature verification

**Generic:**
- Configurable HMAC (sha1 or sha256)
- Custom header name

## Security Best Practices

### 1. Path Restriction

✅ **DO** - Only expose event endpoint:

```json
"/api/webhooks/([^/]+)/events": {
  "Proxy": "http://127.0.0.1:4100"
}
```

❌ **DON'T** - Expose all webhook paths:

```json
"/api/webhooks/": {
  "Proxy": "http://127.0.0.1:4100"
}
```

### 2. Signature Verification

All webhook events verify signatures:

```typescript
// processWebhookEvent.ts validates:
// - GitHub: X-Hub-Signature-256 (HMAC-SHA256)
// - Linear: Linear-Signature (HMAC-SHA256)
// - Jira: Custom verification
// - Generic: Configurable HMAC

// Invalid signature → event status: "invalid_signature"
```

### 3. Rate Limiting

Built-in: 100 requests/minute per webhook ID.

Monitor via WebSocket:

```typescript
// Subscribe to project events
socket.emit("subscribe", { channel: `project:${projectId}` });

// Listen for webhook events
socket.on("webhook.event_received", (data) => {
  console.log("Event:", data.event.status); // success, filtered, invalid_signature, etc.
});
```

### 4. Webhook Statuses

Events only processed when webhook is `active`:

- `draft` - Returns test event, no processing
- `active` - Processes normally
- `paused` - Logs event, no processing
- `error` - Returns test event

### 5. Monitor Events

**Via Prisma Studio:**

```bash
pnpm prisma:studio
# View WebhookEvent table
```

**Via Logs:**

```bash
tail -f apps/app/logs/app.log | jq 'select(.msg | contains("webhook"))'
```

## Testing

### 1. Test Public Access

```bash
# Get a real webhook ID from your database
WEBHOOK_ID="cm3xxxxxxxx"

# Send test event
curl -X POST https://<your-url>/api/webhooks/${WEBHOOK_ID}/events \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=dummy" \
  -d '{
    "action": "opened",
    "pull_request": {
      "title": "Test PR"
    }
  }'

# Should return 200 (even if signature invalid - errors logged internally)
```

### 2. Verify Private Endpoints Blocked

```bash
# Should fail (404 or timeout)
curl https://<your-url>/api/webhooks/${WEBHOOK_ID}

# Should fail
curl https://<your-url>/api/projects/test/webhooks
```

### 3. Test Signature Verification

**GitHub webhook:**

```bash
# Generate valid signature
SECRET="your-webhook-secret"
PAYLOAD='{"test": "data"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.*= //')

curl -X POST https://<your-url>/api/webhooks/${WEBHOOK_ID}/events \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=${SIGNATURE}" \
  -d "$PAYLOAD"
```

**Check event status:**

```bash
# Via Prisma Studio or query WebhookEvent table
# status should be "success" (if conditions pass) or "filtered"
# not "invalid_signature"
```

### 4. Test Rate Limiting

```bash
# Send 101 requests rapidly
for i in {1..101}; do
  curl -X POST https://<your-url>/api/webhooks/${WEBHOOK_ID}/events \
    -H "Content-Type: application/json" \
    -d "{\"test\": $i}"
done

# Request 101+ should fail with 429 Too Many Requests
```

### 5. Test Condition Filtering

Create webhook with conditions, send events that match/don't match:

```bash
# Matches condition → status: "success"
# Doesn't match → status: "filtered"
```

### 6. Monitor via WebSocket

```typescript
// In browser console (when authenticated)
const socket = io("http://localhost:4100");

socket.emit("subscribe", { channel: "project:your-project-id" });

socket.on("webhook.event_received", (data) => {
  console.log("Webhook event:", data);
  // data.event.status: success, filtered, invalid_signature, failed
});

// Send webhook event via curl, see real-time notification
```

## Production Considerations

### Running Funnel 24/7

**Start on boot:**

```bash
# Create systemd service (Linux) or launchd plist (macOS)
# Or use tmux/screen session

tmux new -d -s funnel "tailscale funnel 443 on"
```

**Or background mode:**

```bash
tailscale serve --serve-config=tailscale-serve.json
tailscale funnel --bg 443 on
```

### Monitoring

**Check funnel status:**

```bash
tailscale serve status
tailscale funnel status
```

**Monitor webhook events:**

```bash
# Application logs
tail -f apps/app/logs/app.log | jq 'select(.msg | contains("webhook"))'

# Database
sqlite3 apps/app/prisma/dev.db "SELECT * FROM WebhookEvent ORDER BY createdAt DESC LIMIT 10;"
```

### High Availability

For production, consider:

1. **Deploy to cloud** (Render, Fly.io, Railway) - more reliable than Funnel
2. **Use Funnel for development/testing only**
3. **Set up monitoring/alerts** for webhook failures
4. **Backup webhook events** (already persisted in database)

### Stopping/Restarting

```bash
# Stop funnel (keeps serve running)
tailscale funnel 443 off

# Stop serve + funnel
tailscale serve off
tailscale funnel 443 off

# Restart
tailscale serve --serve-config=tailscale-serve.json
tailscale funnel 443 on
```

## Troubleshooting

### Funnel Not Working

**Check Tailscale status:**

```bash
tailscale status
# Should show connected

tailscale funnel status
# Should show 443 enabled
```

**Check serve config:**

```bash
tailscale serve status
# Should show proxy to localhost:4100
```

**Check server running:**

```bash
curl http://localhost:4100/api/health
# Should return 200
```

### Webhook Events Not Processing

**Check webhook status:**

```sql
sqlite3 apps/app/prisma/dev.db
SELECT id, name, status FROM Webhook WHERE id = 'your-webhook-id';
-- Status should be "active"
```

**Check event logs:**

```sql
SELECT status, error FROM WebhookEvent WHERE webhookId = 'your-webhook-id' ORDER BY createdAt DESC LIMIT 5;
-- Look for error messages
```

**Common event statuses:**

- `invalid_signature` - Wrong secret or signature format
- `filtered` - Conditions didn't match
- `test` - Webhook in draft/paused state
- `failed` - Processing error (check error field)

### Rate Limited

Events return 429 after 100/minute per webhook.

**Solution:**

- Wait 1 minute
- Or increase rate limit in `apps/app/src/server/routes/webhooks.ts:47`

### Path Not Found (404)

**Check path exactly matches:**

```bash
# Correct
/api/webhooks/{webhookId}/events

# Wrong
/api/webhooks/{webhookId}          # Missing /events
/webhooks/{webhookId}/events       # Missing /api prefix
```

**Check serve config:**

```bash
tailscale serve status
# Path pattern should match your request path
```

### HTTPS Certificate Issues

Funnel auto-provisions certs. If issues:

```bash
# Restart funnel
tailscale funnel 443 off
tailscale funnel 443 on

# Check cert status
curl -v https://<your-url>
```

### Server Not Binding Correctly

Ensure server binds to `127.0.0.1` or `0.0.0.0`:

```typescript
// apps/app/src/server/index.ts
await fastify.listen({
  port: config.port,
  host: config.host, // Should be "127.0.0.1" or "0.0.0.0"
});
```

## Log Locations

**Application logs:**

```bash
apps/app/logs/app.log
```

**Tailscale logs:**

```bash
# macOS
/var/log/tailscaled.log

# Linux
journalctl -u tailscaled
```

**Database:**

```bash
apps/app/prisma/dev.db
# View WebhookEvent table via Prisma Studio
```

## Example Webhook URLs

After setting up Funnel, configure webhooks in external services:

**GitHub:**

```
Payload URL: https://<your-url>/api/webhooks/{webhookId}/events
Content type: application/json
Secret: (your webhook secret from database)
Events: Choose specific events or "Send me everything"
```

**Linear:**

```
Webhook URL: https://<your-url>/api/webhooks/{webhookId}/events
Secret: (your webhook secret)
```

**Jira:**

```
URL: https://<your-url>/api/webhooks/{webhookId}/events
(Configure signature verification in Jira settings)
```

**Generic:**

```
URL: https://<your-url>/api/webhooks/{webhookId}/events
Headers: Configure custom signature header + HMAC method (sha1/sha256)
```

## See Also

- `.agent/docs/websocket-architecture.md` - Real-time event notifications
- `apps/app/src/server/routes/webhooks.ts` - Webhook routes
- `apps/app/src/server/domain/webhook/services/processWebhookEvent.ts` - Event processing logic
- [Tailscale Funnel Docs](https://tailscale.com/kb/1223/funnel/)
