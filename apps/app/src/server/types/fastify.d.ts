// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      is_active: boolean;
    };
  }
}
