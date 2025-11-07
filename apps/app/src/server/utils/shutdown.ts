import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/prisma';
import type { ActiveSessionsManager } from '@/server/websocket/infrastructure/active-sessions';
import type { ReconnectionManager } from '@/server/websocket/infrastructure/reconnection';
import { killProcess } from 'agent-cli-sdk';

/**
 * Setup graceful shutdown handlers for SIGINT and SIGTERM signals.
 * Ensures clean shutdown of WebSocket connections, server, and database.
 *
 * @param fastify - Fastify server instance
 * @param activeSessions - Active sessions manager
 * @param reconnectionManager - Reconnection manager
 *
 * @example
 * ```ts
 * import { setupGracefulShutdown } from '@/server/utils/shutdown';
 * import { activeSessions, reconnectionManager } from '@/server/websocket';
 *
 * await server.listen({ port: 3456 });
 * setupGracefulShutdown(server, activeSessions, reconnectionManager);
 * ```
 */
export async function setupGracefulShutdown(
  fastify: FastifyInstance,
  activeSessions: ActiveSessionsManager,
  reconnectionManager: ReconnectionManager
): Promise<void> {
  const shutdown = async (signal: string) => {
    fastify.log.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

    try {
      // 1. Cancel all reconnection timers
      fastify.log.info('Cancelling reconnection timers...');
      reconnectionManager.cancelAll();
      fastify.log.info('Reconnection timers cancelled');

      // 2. Kill all running agent processes
      fastify.log.info('Killing active agent processes...');
      const killPromises: Promise<unknown>[] = [];

      for (const [sessionId, sessionData] of activeSessions.entries()) {
        if (sessionData.childProcess) {
          fastify.log.info({ sessionId }, 'Killing process for session');
          const killPromise = killProcess(sessionData.childProcess, { timeoutMs: 5000 })
            .then((result) => {
              fastify.log.info(
                { sessionId, killed: result.killed, signal: result.signal },
                'Process killed'
              );
            })
            .catch((err) => {
              fastify.log.warn({ sessionId, err }, 'Error killing process');
            });
          killPromises.push(killPromise);
        }
      }

      // Wait for all processes to be killed (max 10s total)
      if (killPromises.length > 0) {
        await Promise.race([
          Promise.all(killPromises),
          new Promise((resolve) => setTimeout(resolve, 10000))
        ]);
        fastify.log.info('All processes killed or timed out');
      }

      // 3. Close Fastify server (stops accepting new connections)
      fastify.log.info('Closing Fastify server...');
      await fastify.close();
      fastify.log.info('Fastify server closed');

      // 4. Cleanup WebSocket sessions and temp image directories
      const sessionCount = activeSessions.size;

      if (sessionCount > 0) {
        fastify.log.info({ count: sessionCount }, 'Cleaning up active sessions...');

        for (const [sessionId] of activeSessions.entries()) {
          try {
            await activeSessions.cleanup(sessionId, fastify.log);
          } catch (err) {
            fastify.log.warn({ sessionId, err }, 'Error cleaning up session');
          }
        }

        fastify.log.info('All sessions cleaned up');
      }

      // 5. Disconnect Prisma
      fastify.log.info('Disconnecting Prisma...');
      await prisma.$disconnect();
      fastify.log.info('Prisma disconnected');

      fastify.log.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      fastify.log.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
