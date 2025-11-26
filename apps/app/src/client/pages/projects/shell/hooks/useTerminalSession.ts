import { useShell } from "@/client/pages/projects/shell/contexts/ShellContext";
import type { TerminalSession } from "@/client/pages/projects/shell/contexts/ShellContext";

/**
 * Convenience hook for accessing a specific terminal session by ID
 * @param sessionId - The ID of the session to access
 * @returns The terminal session or undefined if not found
 */
export function useTerminalSession(sessionId: string): TerminalSession | undefined {
  const { getSession } = useShell();
  return getSession(sessionId);
}
