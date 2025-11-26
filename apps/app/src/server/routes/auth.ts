import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/shared/prisma';
import { registerSchema, loginSchema, authResponseSchema, authStatusResponseSchema, userResponseSchema } from '@/server/domain/auth/schemas';
import { errorResponse } from '@/server/domain/common/schemas';
import type { JWTPayload } from '@/server/utils/auth';
import { buildErrorResponse } from '@/server/errors';

export async function authRoutes(fastify: FastifyInstance) {
  // Check auth status and setup requirements
  fastify.get('/api/auth/status', {
    schema: {
      response: {
        200: authStatusResponseSchema,
      },
    },
  }, async (_request, reply) => {
    try {
      const userCount = await prisma.user.count();
      const needsSetup = userCount === 0;

      return reply.send({
        needsSetup,
        isAuthenticated: false, // Will be overridden by frontend if token exists
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Auth status error');
      // @ts-ignore - error response
      return reply.status(500).send(buildErrorResponse(500, 'Internal server error'));
    }
  });

  // User registration (setup) - only allowed if no users exist
  fastify.post<{
    Body: { email: string; password: string };
  }>('/api/auth/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
    schema: {
      body: registerSchema,
      response: {
        200: authResponseSchema,
        403: errorResponse,
        409: errorResponse,
        503: errorResponse,
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    // Check if users already exist (only allow one user)
    const existingUserCount = await prisma.user.count();
    if (existingUserCount > 0) {
      return reply.code(403).send(buildErrorResponse(403, 'User already exists. This is a single-user system.'));
    }

    try {
      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password_hash,
          last_login: new Date(),
        },
        select: {
          id: true,
          email: true,
        },
      });

      // Generate token (no expiration)
      const token = fastify.jwt.sign(
        {
          userId: user.id,
          email: user.email,
        } as JWTPayload,
        // No expiration - token lasts forever
      );

      return reply.send({
        success: true,
        user,
        token,
      });
    } catch (error) {
      // Check for connection-specific Prisma errors first
      if (
        error instanceof Prisma.PrismaClientInitializationError ||
        error instanceof Prisma.PrismaClientRustPanicError ||
        error instanceof Prisma.PrismaClientUnknownRequestError
      ) {
        // Re-throw connection errors for global error handler
        throw error;
      }

      // Check for unique constraint violation (Prisma error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return reply.code(409).send(buildErrorResponse(409, 'Email already exists', 'DUPLICATE_EMAIL'));
        }
      }

      throw error;
    }
  });

  // User login
  fastify.post<{
    Body: { email: string; password: string };
  }>('/api/auth/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
    schema: {
      body: loginSchema,
      response: {
        200: authResponseSchema,
        401: errorResponse,
        403: errorResponse,
        503: errorResponse,
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.code(401).send(buildErrorResponse(401, 'Invalid email or password'));
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return reply.code(401).send(buildErrorResponse(401, 'Invalid email or password'));
    }

    // Check if user is active
    if (!user.is_active) {
      return reply.code(403).send(buildErrorResponse(403, 'Account is inactive'));
    }

    // Generate token (no expiration)
    const token = fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
      } as JWTPayload,
      // No expiration - token lasts forever
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    return reply.send({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  });

  // Get current user (protected route)
  fastify.get('/api/auth/user', {
    preHandler: fastify.authenticate,
    schema: {
      response: {
        200: userResponseSchema,
      },
    },
  }, async (request, reply) => {
    return reply.send({
      data: request.user,
    });
  });

  // Logout (client-side token removal, but this endpoint exists for consistency)
  fastify.post('/api/auth/logout', {
    preHandler: fastify.authenticate,
  }, async (_request, reply) => {
    // In a simple JWT system, logout is mainly client-side
    // This endpoint exists for consistency and potential future logging
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });
}
