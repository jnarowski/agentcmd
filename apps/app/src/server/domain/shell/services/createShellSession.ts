import * as pty from 'node-pty';
import * as os from 'os';
import { getProjectById } from '@/server/domain/project/services/getProjectById';
import { setShellSession } from './getShellSession';
import type { CreateShellSessionOptions } from '../types/CreateShellSessionOptions';

/**
 * Detect platform and return appropriate shell configuration
 */
function getShellConfig(): { shell: string; args: string[] } {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: Use PowerShell
    return {
      shell: 'powershell.exe',
      args: ['-NoLogo'],
    };
  } else {
    // Unix-like (macOS, Linux): Use bash
    return {
      shell: process.env.SHELL || 'bash',
      args: ['--login'],
    };
  }
}

/**
 * Create a new shell session
 * @returns Session ID and PTY process
 */
export async function createShellSession({
  projectId,
  userId,
  cols,
  rows
}: CreateShellSessionOptions): Promise<{ sessionId: string; ptyProcess: pty.IPty }> {
  // Get project to determine working directory
  const project = await getProjectById({ id: projectId });
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Get platform-specific shell configuration
  const { shell, args } = getShellConfig();

  // Create PTY process
  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: project.path,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '3',
    } as { [key: string]: string },
  });

  // Generate session ID and store session
  const sessionId = `shell_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  setShellSession(sessionId, {
    ptyProcess,
    projectId,
    userId,
    createdAt: new Date(),
  });

  return { sessionId, ptyProcess };
}
