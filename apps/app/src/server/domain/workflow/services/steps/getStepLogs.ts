import { promises as fs } from 'node:fs';
import path from 'node:path';
import { prisma } from '@/shared/prisma';

/**
 * Get step logs from filesystem
 * Returns logs content and path, or null if not found
 */
export async function getStepLogs(
  runId: string,
  stepId: string
): Promise<{ logs: string; path: string } | null> {
  // Query step to get log directory path
  const step = await prisma.workflowRunStep.findFirst({
    where: {
      workflow_run_id: runId,
      id: stepId,
    },
    select: {
      log_directory_path: true,
    },
  });

  if (!step || !step.log_directory_path) {
    return null;
  }

  // Construct log file path (assuming logs are in a file named 'output.log')
  const logFilePath = path.join(step.log_directory_path, 'output.log');

  try {
    const logs = await fs.readFile(logFilePath, 'utf-8');
    return {
      logs,
      path: logFilePath,
    };
  } catch (error) {
    // File not found or read error
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error; // Re-throw unexpected errors
  }
}
