import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import readline from "readline";
import { syncProjectSessions, bulkGenerateSessionNames } from "@/server/domain/session/services";
import { getClaudeProjectsDir } from "@/server/utils/path";
import type { SyncProjectsResponse } from "@/shared/types/project-sync.types";
import type { SyncFromClaudeProjectsOptions } from "@/server/domain/project/types/SyncFromClaudeProjectsOptions";

/**
 * Decode filesystem-encoded project path back to real path
 * @param projectName - Encoded project name (e.g., "Users-john-myproject")
 * @returns Decoded path (e.g., "/Users/john/myproject")
 */
function decodeProjectPath(projectName: string): string {
  const decoded = projectName.replace(/-/g, "/");
  // Add leading slash if not present
  return decoded.startsWith("/") ? decoded : `/${decoded}`;
}

/**
 * Check if a file is a valid session file
 * Valid files must end with .jsonl and NOT start with "agent-"
 * @param filename - The filename to check
 * @returns True if valid session file, false otherwise
 */
function isValidSessionFile(filename: string): boolean {
  return filename.endsWith('.jsonl') && !filename.startsWith('agent-');
}

/**
 * Extract the actual project directory from JSONL session files
 * @param projectName - Encoded project name from filesystem
 * @returns Extracted project path
 */
async function extractProjectDirectory(projectName: string): Promise<string> {
  const projectDir = path.join(getClaudeProjectsDir(), projectName);
  const cwdCounts = new Map<string, number>();
  let latestTimestamp = 0;
  let latestCwd: string | null = null;
  let extractedPath: string;

  try {
    // Check if the project directory exists
    await fs.access(projectDir);

    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter(isValidSessionFile);

    if (jsonlFiles.length === 0) {
      // Fall back to decoded project name if no sessions
      extractedPath = decodeProjectPath(projectName);
    } else {
      // Process all JSONL files to collect cwd values
      for (const file of jsonlFiles) {
        const jsonlFile = path.join(projectDir, file);
        const fileStream = fsSync.createReadStream(jsonlFile);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });

        for await (const line of rl) {
          if (line.trim()) {
            try {
              const entry = JSON.parse(line);

              if (entry.cwd) {
                // Count occurrences of each cwd
                cwdCounts.set(entry.cwd, (cwdCounts.get(entry.cwd) || 0) + 1);

                // Track the most recent cwd
                const timestamp = new Date(
                  entry.timestamp || 0
                ).getTime();
                if (timestamp > latestTimestamp) {
                  latestTimestamp = timestamp;
                  latestCwd = entry.cwd;
                }
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      }

      // Determine the best cwd to use
      if (cwdCounts.size === 0) {
        // No cwd found, fall back to decoded project name
        extractedPath = decodeProjectPath(projectName);
      } else if (cwdCounts.size === 1) {
        // Only one cwd, use it
        extractedPath = Array.from(cwdCounts.keys())[0];
      } else {
        // Multiple cwd values - prefer the most recent one if it has reasonable usage
        const mostRecentCount = cwdCounts.get(latestCwd!) || 0;
        const maxCount = Math.max(...cwdCounts.values());

        // Use most recent if it has at least 25% of the max count
        if (mostRecentCount >= maxCount * 0.25) {
          extractedPath = latestCwd!;
        } else {
          // Otherwise use the most frequently used cwd
          extractedPath = "";
          for (const [cwd, count] of cwdCounts.entries()) {
            if (count === maxCount) {
              extractedPath = cwd;
              break;
            }
          }
        }

        // Fallback (shouldn't reach here)
        if (!extractedPath) {
          extractedPath =
            latestCwd || decodeProjectPath(projectName);
        }
      }
    }

    return extractedPath;
  } catch (error: unknown) {
    // If the directory doesn't exist, just use the decoded project name
    const err = error instanceof Error ? error : new Error(String(error));
    if ('code' in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      extractedPath = decodeProjectPath(projectName);
    } else {
      // Fall back to decoded project name for other errors
      extractedPath = decodeProjectPath(projectName);
    }

    return extractedPath;
  }
}

/**
 * Sync projects from Claude CLI ~/.claude/projects/ directory
 * Only imports projects with more than 3 sessions
 * @param options - Options object with userId
 * @returns Sync statistics
 */
export async function syncFromClaudeProjects({ userId, logger }: SyncFromClaudeProjectsOptions): Promise<SyncProjectsResponse> {
  let projectsImported = 0;
  let projectsUpdated = 0;
  let totalSessionsSynced = 0;

  const claudeProjectsDir = getClaudeProjectsDir();

  try {
    // Check if directory exists
    await fs.access(claudeProjectsDir);
  } catch {
    // Directory doesn't exist, return empty stats
    return {
      projectsImported: 0,
      projectsUpdated: 0,
      totalSessionsSynced: 0,
    };
  }

  // Read directory entries
  const entries = await fs.readdir(claudeProjectsDir, {
    withFileTypes: true,
  });

  // Filter for directories only
  const projectDirs = entries.filter((entry) => entry.isDirectory());

  // Import hasEnoughSessions to avoid code duplication
  const { hasEnoughSessions } = await import('./hasEnoughSessions');

  // Process each project directory
  for (const projectDir of projectDirs) {
    const projectName = projectDir.name;

    // Skip projects without enough sessions (must have >3 sessions)
    const enoughSessions = await hasEnoughSessions({ projectName });
    if (!enoughSessions) {
      continue;
    }

    // Extract actual project path
    const actualPath = await extractProjectDirectory(projectName);

    // Generate display name from last path segment
    const displayName = path.basename(actualPath);

    // Dynamic import for testability (allows mocking in tests)
    const { createOrUpdateProject } = await import("@/server/domain/project/services");

    // Create or update project
    const project = await createOrUpdateProject({
      name: displayName,
      path: actualPath
    });

    // Determine if project was created or updated
    const isNewProject =
      project.created_at.getTime() === project.updated_at.getTime();

    if (isNewProject) {
      projectsImported++;
    } else {
      projectsUpdated++;
    }

    // Sync sessions for this project
    const sessionsSyncResult = await syncProjectSessions({
      projectId: project.id,
      userId,
    });

    totalSessionsSynced += sessionsSyncResult.synced;
  }

  // After all projects synced, trigger bulk naming for most recent 50 unnamed sessions
  // across all projects (fire-and-forget, non-blocking)
  if (totalSessionsSynced > 0) {
    bulkGenerateSessionNames({
      userId,
      limit: 50,
      logger,
    }).catch((err) => {
      logger.error(
        { err, userId },
        "Background session naming failed after project sync (non-critical)"
      );
    });
  }

  return {
    projectsImported,
    projectsUpdated,
    totalSessionsSynced,
  };
}
