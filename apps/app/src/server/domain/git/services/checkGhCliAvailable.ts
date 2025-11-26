import { exec } from 'child_process'
import { promisify } from 'util'
import type { CheckGhCliAvailableOptions } from '../types/CheckGhCliAvailableOptions'

const execAsync = promisify(exec)

/**
 * Check if GitHub CLI is available and authenticated
 */
export async function checkGhCliAvailable({ projectPath }: CheckGhCliAvailableOptions): Promise<boolean> {
  try {
    await execAsync('gh auth status', { cwd: projectPath });
    return true;
  } catch {
    return false;
  }
}
