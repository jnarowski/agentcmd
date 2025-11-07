#!/usr/bin/env tsx
// Type augmentation loaded automatically via tsconfig
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import fastifyMultipart from "@fastify/multipart";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { Prisma } from "@prisma/client";
import { registerRoutes } from "@/server/routes";
import {
  registerWebSocket,
  activeSessions,
  reconnectionManager,
} from "@/server/websocket/index";
import { registerShellRoute } from "@/server/routes/shell";
import { authPlugin } from "@/server/plugins/auth";
import { setupGracefulShutdown } from "@/server/utils/shutdown";
import { config } from "@/server/config/Configuration";
import { AppError, ConflictError, buildErrorResponse } from "@/server/errors";
import { ServiceUnavailableError } from "@/server/errors/ServiceUnavailableError";
import { initializeWorkflowEngine } from "@/server/domain/workflow/services/engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createServer() {
  // Validate configuration on startup (will throw if invalid)
  const serverConfig = config.get("server");

  const fastify = Fastify({
    logger:
      serverConfig.nodeEnv === "production"
        ? {
            level: serverConfig.logLevel,
            transport: {
              targets: [
                // Console output (for Docker, PM2, systemd)
                {
                  target: "pino/file",
                  options: { destination: 1 }, // stdout
                  level: "info",
                },
                // File output with rotation
                {
                  target: "pino-roll",
                  options: {
                    file: serverConfig.logFile,
                    frequency: "daily",
                    size: "5m",
                    mkdir: true,
                    limit: {
                      count: 30,
                    },
                  },
                  level: serverConfig.logLevel,
                },
              ],
            },
          }
        : {
            // Development: pretty-print to console + log file
            level: serverConfig.logLevel,
            transport: {
              targets: [
                // Pretty console output
                {
                  target: "pino-pretty",
                  options: {
                    colorize: true,
                    translateTime: "HH:MM:ss Z",
                    ignore: "pid,hostname",
                  },
                  level: serverConfig.logLevel,
                },
                // File output with rotation (plain JSON)
                {
                  target: "pino-roll",
                  options: {
                    file: serverConfig.logFile,
                    frequency: "daily",
                    size: "5m",
                    mkdir: true,
                    limit: {
                      count: 7,
                    },
                  },
                  level: serverConfig.logLevel,
                },
              ],
            },
          },
  }).withTypeProvider<ZodTypeProvider>();

  // Intercept console.log/error/warn and redirect to Pino logger
  // This captures console.log calls from dependencies like agent-cli-sdk
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = (...args: unknown[]) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");
    fastify.log.info(message);
  };

  console.error = (...args: unknown[]) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");
    fastify.log.error(message);
  };

  console.warn = (...args: unknown[]) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");
    fastify.log.warn(message);
  };

  // Store originals for potential restoration
  (
    fastify as typeof fastify & { _originalConsole?: Pick<Console, 'log' | 'error' | 'warn'> }
  )._originalConsole = {
    log: originalConsoleLog,
    error: originalConsoleError,
    warn: originalConsoleWarn,
  };

  // Set up Zod validation
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Custom error handler for Zod validation and custom errors
  fastify.setErrorHandler((error, request, reply) => {
    // Handle Zod validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.validation,
          statusCode: 400,
        },
      });
    }

    // Handle all AppError subclasses (new and legacy)
    if (error instanceof AppError) {
      // Log error with appropriate level
      const logLevel = error.statusCode >= 500 ? "error" : "warn";
      fastify.log[logLevel](
        {
          err: error,
          statusCode: error.statusCode,
          code: error.code,
          context: error.context,
          url: request.url,
          method: request.method,
        },
        `${error.constructor.name}: ${error.message}`
      );

      // Use the error's toJSON method for consistent response format
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Handle Prisma connection/initialization errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      fastify.log.error(
        {
          err: error,
          url: request.url,
          method: request.method,
        },
        "Database initialization error"
      );

      const serviceError = new ServiceUnavailableError(
        "Database connection failed. Please run `pnpm dev:setup` to initialize the database.",
        { prismaError: error.message },
        60 // Retry after 60 seconds
      );
      return reply.status(503).send(serviceError.toJSON());
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      fastify.log.error(
        {
          err: error,
          url: request.url,
          method: request.method,
        },
        "Database engine panic"
      );

      const serviceError = new ServiceUnavailableError(
        "Database engine error. Please check the database configuration and try again.",
        { prismaError: error.message },
        30 // Retry after 30 seconds
      );
      return reply.status(503).send(serviceError.toJSON());
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      fastify.log.error(
        {
          err: error,
          url: request.url,
          method: request.method,
        },
        "Unknown database request error"
      );

      const serviceError = new ServiceUnavailableError(
        "Database is temporarily unavailable. Please try again later.",
        { prismaError: error.message },
        30 // Retry after 30 seconds
      );
      return reply.status(503).send(serviceError.toJSON());
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      fastify.log.error(
        {
          err: error,
          url: request.url,
          method: request.method,
        },
        "Database validation error"
      );

      return reply
        .status(500)
        .send(
          buildErrorResponse(
            500,
            "Database validation error",
            "DATABASE_VALIDATION_ERROR"
          )
        );
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record not found
        return reply
          .status(404)
          .send(
            buildErrorResponse(404, "Resource not found", "PRISMA_NOT_FOUND")
          );
      }
      if (error.code === "P2002") {
        // Unique constraint violation
        const conflictError = new ConflictError("Resource already exists", {
          prismaCode: error.code,
          meta: error.meta,
        });
        return reply.status(409).send(conflictError.toJSON());
      }
      // Other Prisma errors
      fastify.log.error(
        {
          err: error,
          prismaCode: error.code,
          url: request.url,
          method: request.method,
        },
        "Prisma error"
      );
      return reply
        .status(500)
        .send(buildErrorResponse(500, "Database error", "DATABASE_ERROR"));
    }

    // Default error handling for unexpected errors
    const statusCode = error.statusCode || 500;

    // Log detailed error information for debugging
    fastify.log.error(
      {
        err: error,
        errorType: error.constructor.name,
        errorMessage: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        userId: (request as any).user?.id,
        reqId: request.id,
        body: statusCode === 500 ? request.body : undefined, // Only log body for 500s
        params: request.params,
        query: request.query,
      },
      `Unhandled ${statusCode} error: ${error.message}`
    );

    // Build response based on environment
    const isDevelopment = config.get("server").nodeEnv === "development";
    const errorResponse: any = {
      error: {
        message:
          statusCode === 500
            ? "Internal server error"
            : error.message || "Request failed",
        statusCode,
      },
    };

    // Include detailed error info in development
    if (isDevelopment && statusCode === 500) {
      errorResponse.error.details = {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack
        url: request.url,
        method: request.method,
      };
    }

    return reply.status(statusCode).send(errorResponse);
  });

  // Configure JSON parser to allow empty bodies
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        // Allow empty bodies (e.g., DELETE requests with Content-Type: application/json)
        const json = body === "" ? {} : JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Register CORS
  const corsConfig = config.get("cors");
  await fastify.register(cors, {
    origin: corsConfig.allowedOrigins,
    credentials: true,
  });

  // Register rate limiting (global: false - only on specific routes)
  await fastify.register(rateLimit, {
    global: false,
  });

  // Register auth plugin (JWT)
  await fastify.register(authPlugin);

  // Register multipart/form-data support for file uploads
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
  });

  // Register WebSocket support
  await fastify.register(fastifyWebsocket);

  // Register API routes
  await registerRoutes(fastify);

  // Register WebSocket handler
  await registerWebSocket(fastify);

  // Register Shell WebSocket handler
  await registerShellRoute(fastify);

  // Initialize workflow engine (includes project scanning)
  await initializeWorkflowEngine(fastify);

  // Serve static files from dist/client/ (production build only)
  // In production, the built client files are in dist/client/
  const distDir = join(__dirname, "../../dist/client");
  const hasDistDir = existsSync(distDir);

  if (hasDistDir) {
    await fastify.register(fastifyStatic, {
      root: distDir,
      prefix: "/",
    });

    // SPA fallback: serve index.html for all non-API routes
    fastify.setNotFoundHandler((request, reply) => {
      if (
        request.url.startsWith("/api") ||
        request.url.startsWith("/ws") ||
        request.url.startsWith("/shell")
      ) {
        reply.code(404).send({ error: "Not found" });
      } else {
        reply.sendFile("index.html");
      }
    });
  } else {
    // Development mode: no static files, just API and WebSocket
    fastify.setNotFoundHandler((request, reply) => {
      if (
        request.url.startsWith("/api") ||
        request.url.startsWith("/ws") ||
        request.url.startsWith("/shell")
      ) {
        reply.code(404).send({ error: "Not found" });
      } else {
        reply.code(200).send({
          message: "Development mode: Frontend not built",
          hint: 'Run "pnpm dev" to start both frontend (Vite) and backend servers',
          viteUrl: "http://localhost:5173",
          apiUrl: "http://localhost:3456/api",
        });
      }
    });
  }

  return fastify;
}

/**
 * Start server with optional port/host overrides
 * Used by CLI tool to start server with config from CLI flags
 */
export async function startServer(options?: { port?: number; host?: string }) {
  const serverConfig = config.get("server");
  const PORT = options?.port ?? serverConfig.port;
  const HOST = options?.host ?? serverConfig.host;

  const server = await createServer();

  await server.listen({
    port: PORT,
    host: HOST,
  });

  // Setup graceful shutdown handlers
  await setupGracefulShutdown(server, activeSessions, reconnectionManager);

  return server;
}

// Start server when run directly (not imported as module)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Validate configuration (will throw on startup if invalid)
  const serverConfig = config.get("server");
  const PORT = serverConfig.port;
  const HOST = serverConfig.host;

  await startServer({ port: PORT, host: HOST });

  console.log("");
  console.log("🚀 Fastify server running at:");
  console.log(`   http://${HOST}:${PORT}`);
  console.log("   Press Ctrl+C to stop gracefully");
  console.log("");
}
