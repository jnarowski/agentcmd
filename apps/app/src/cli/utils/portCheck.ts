import detect from "detect-port";

/**
 * Checks if a port is available
 * @param port - Port number to check
 * @returns Promise that resolves to true if port is available, false otherwise
 */
export async function checkPortAvailable(port: number): Promise<boolean> {
  try {
    const availablePort = await detect(port);
    return availablePort === port;
  } catch (error) {
    console.error(`Error checking port ${port}:`, error);
    return false;
  }
}

/**
 * Checks if a port is available, throws error with helpful message if not
 * @param port - Port number to check
 * @param portName - Name of the port for error message (e.g., "server", "Inngest")
 */
export async function ensurePortAvailable(
  port: number,
  portName: string
): Promise<void> {
  const isAvailable = await checkPortAvailable(port);

  if (!isAvailable) {
    throw new Error(
      `Port ${port} (${portName}) is already in use. Try using a different port with --port or --inngest-port flags.`
    );
  }
}
