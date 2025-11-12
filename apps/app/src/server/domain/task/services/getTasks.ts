/**
 * Aggregate tasks (specs) and planning sessions with 30s cache
 */

import type { TasksResponse } from "@/shared/types/task.types";
import { scanSpecs } from "@/server/domain/task/services/scanSpecs";
import { getSessions } from "@/server/domain/session/services/getSessions";
import { prisma } from "@/shared/prisma";

interface CacheEntry {
  data: TasksResponse;
  timestamp: number;
  userId: string;
}

const CACHE_TTL = 30000; // 30 seconds
const cache = new Map<string, CacheEntry>();

/**
 * Get all tasks (specs from ALL projects' .agent/specs/todo/ folders) and planning sessions
 * Results are cached per user for 30 seconds
 */
export async function getTasks(userId: string): Promise<TasksResponse> {
  const now = Date.now();
  const cacheKey = userId;

  // Return cached data if valid
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Get all projects for this user
  const projects = await prisma.project.findMany({
    select: { id: true, path: true },
  });

  // Scan specs from all projects
  const allTasks = await Promise.all(
    projects.map((project) => scanSpecs(project.path, project.id))
  );
  const tasks = allTasks.flat();

  // Get planning sessions (across all projects)
  const planningSessions = await getSessions({
    userId,
    permission_mode: "plan",
    includeArchived: false,
    limit: 50, // Reasonable limit for planning sessions
  });

  const data: TasksResponse = {
    tasks,
    planningSessions,
  };

  // Update cache
  cache.set(cacheKey, {
    data,
    timestamp: now,
    userId,
  });

  return data;
}

/**
 * Clear cache to force fresh data fetch on next call
 */
export function clearTasksCache(): void {
  cache.clear();
}
