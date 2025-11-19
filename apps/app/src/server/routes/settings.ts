/**
 * Settings Routes
 * Provides application settings and feature flags
 */

import type { FastifyInstance } from "fastify";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { buildSuccessResponse } from "@/server/utils/response";
import { getCapabilities } from "agent-cli-sdk";
import { config } from "@/server/config";
import { prisma } from "@/shared/prisma";
import '@/server/plugins/auth';

const execAsync = promisify(exec);

// Zod schema for user preferences (snake_case keys for database)
const userPreferencesSchema = z.object({
  default_permission_mode: z.enum(["default", "plan", "acceptEdits", "bypassPermissions"]),
  default_theme: z.enum(["light", "dark", "system"]),
  session_theme: z.enum(["default", "nature"]),
  default_agent: z.enum(["claude", "codex", "cursor", "gemini"]),
  onboarding_dismissed: z.boolean().optional(),
  activity_filter: z.enum(["all", "sessions", "workflows"]).optional(),
  projects_view: z.enum(["all", "favorites", "hidden"]).optional(),
  sidebar_active_tab: z.enum(["projects", "activities", "tasks"]).optional(),
  project_home_active_tab: z.enum(["activities", "tasks"]).optional(),
  active_project_filter: z.string().nullable().optional(),
  dismissed_content: z.record(z.string(), z.boolean()).optional(),
});

// Zod schema for updating user preferences (all fields optional)
const updateUserPreferencesSchema = userPreferencesSchema.partial();

type UserPreferences = z.infer<typeof userPreferencesSchema>;
type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;

// Default user preferences
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  default_permission_mode: "acceptEdits",
  default_theme: "dark",
  session_theme: "default",
  default_agent: "claude",
};

/**
 * Check if GitHub CLI (gh) is installed and accessible
 */
async function checkGhInstalled(): Promise<boolean> {
  try {
    await execAsync("gh --version");
    return true;
  } catch {
    return false;
  }
}

export async function settingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/settings
   * Get application settings and feature flags
   * Requires authentication to prepare for user-specific configuration
   */
  fastify.get(
    "/api/settings",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = (request.user! as { id: string }).id;
      const ghInstalled = await checkGhInstalled();

      fastify.log.info({ userId }, "Fetching settings");

      // Fetch user from database to get settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      // Parse user.settings JSON, use defaults if null
      const userPreferences: UserPreferences = user?.settings
        ? { ...DEFAULT_USER_PREFERENCES, ...(user.settings as object) }
        : DEFAULT_USER_PREFERENCES;

      const settings = {
        features: {
          aiEnabled: !!config.apiKeys.anthropicApiKey,
          gitEnabled: true, // Git operations are always available
          ghCliEnabled: ghInstalled, // GitHub CLI for PR creation
        },
        agents: {
          claude: await getCapabilities("claude"),
          codex: await getCapabilities("codex"),
          cursor: await getCapabilities("cursor"),
          gemini: await getCapabilities("gemini"),
        },
        userPreferences,
        version: "0.1.0",
      };

      return reply.send(buildSuccessResponse(settings));
    }
  );

  /**
   * PATCH /api/settings
   * Update user preferences
   * Requires authentication
   */
  fastify.patch<{
    Body: UpdateUserPreferences;
  }>(
    "/api/settings",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: updateUserPreferencesSchema,
      },
    },
    async (request, reply) => {
      const userId = (request.user! as { id: string }).id;
      const updates = request.body;

      fastify.log.info({ userId, updates }, "Updating user settings");

      // Fetch current settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      // Merge with existing settings
      const currentSettings = user?.settings
        ? { ...DEFAULT_USER_PREFERENCES, ...(user.settings as object) }
        : DEFAULT_USER_PREFERENCES;

      const updatedSettings = { ...currentSettings, ...updates };

      // Update user.settings JSON field
      await prisma.user.update({
        where: { id: userId },
        data: { settings: updatedSettings },
      });

      // Return updated settings in same format as GET
      const ghInstalled = await checkGhInstalled();

      const settings = {
        features: {
          aiEnabled: !!config.apiKeys.anthropicApiKey,
          gitEnabled: true,
          ghCliEnabled: ghInstalled,
        },
        agents: {
          claude: await getCapabilities("claude"),
          codex: await getCapabilities("codex"),
          cursor: await getCapabilities("cursor"),
          gemini: await getCapabilities("gemini"),
        },
        userPreferences: updatedSettings,
        version: "0.1.0",
      };

      return reply.send(buildSuccessResponse(settings));
    }
  );
}
