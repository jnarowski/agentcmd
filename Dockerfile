# Multi-stage Dockerfile for AgentCmd
# Optimized for E2E testing with Playwright

# Stage 1: Base
FROM node:22-alpine AS base
WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies

# Install build tools (required for node-pty native module)
RUN apk add --no-cache python3 make g++

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files
COPY packages/agent-cli-sdk/package.json ./packages/agent-cli-sdk/
COPY packages/agentcmd-workflows/package.json ./packages/agentcmd-workflows/
COPY apps/app/package.json ./apps/app/
COPY apps/website/package.json ./apps/website/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 3: Builder
FROM dependencies AS builder

# Copy source code
COPY . .

# Build all packages and app (Turborepo handles dependency order)
RUN pnpm build

# Stage 4: Runner
FROM base AS runner

# Install wget for health checks
RUN apk add --no-cache wget

# Copy production dependencies and built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/app/dist ./apps/app/dist
COPY --from=builder /app/apps/app/package.json ./apps/app/package.json

# Create data directory and set permissions
RUN mkdir -p /data && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app /data

# Switch to non-root user
USER nodejs

# Set working directory
WORKDIR /app/apps/app

# Expose backend port
EXPOSE 4100

# Start command: run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./dist/prisma/schema.prisma && node dist/server/index.js"]
