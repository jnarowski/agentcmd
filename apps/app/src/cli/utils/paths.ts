import { homedir } from "os";
import { join, resolve } from "path";
import { mkdirSync } from "fs";
import { CLI_NAME } from "./constants.js";

/**
 * Expands ~ to the user's home directory
 */
export function resolvePath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return resolve(path);
}

/**
 * Returns the home directory for the CLI
 * ~/.agent-workflows/ (or whatever CLI_NAME is set to)
 */
export function getHomeDir(): string {
  return resolvePath(`~/.${CLI_NAME}`);
}

/**
 * Returns the path to the config file
 */
export function getConfigPath(): string {
  return join(getHomeDir(), "config.json");
}

/**
 * Returns the path to the database file
 */
export function getDbPath(): string {
  return join(getHomeDir(), "database.db");
}

/**
 * Returns the logs directory path
 */
export function getLogsDir(): string {
  return join(getHomeDir(), "logs");
}

/**
 * Returns the main log file path
 */
export function getLogFilePath(): string {
  return join(getLogsDir(), "app.log");
}

/**
 * Returns the global workflows directory path
 */
export function getGlobalWorkflowsDir(): string {
  return join(getHomeDir(), "workflows");
}

/**
 * Creates directory if it doesn't exist
 */
export function ensureDirectoryExists(dirPath: string): void {
  const resolvedPath = resolvePath(dirPath);
  mkdirSync(resolvedPath, { recursive: true });
}
