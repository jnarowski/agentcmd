import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { useTheme } from "next-themes";
import { useShell } from "@/client/pages/projects/shell/contexts/ShellContext";
import { useShellWebSocket } from "@/client/pages/projects/shell/hooks/useShellWebSocket";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  sessionId: string;
  projectId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function Terminal({
  sessionId,
  projectId,
  onConnect,
  onDisconnect,
}: TerminalProps) {
  // ============================================================================
  // Refs and State
  // ============================================================================
  const { theme } = useTheme();
  const { addSession, removeSession } = useShell();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // ============================================================================
  // WebSocket Integration
  // ============================================================================
  // Stable callbacks for WebSocket
  const handleOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const handleExit = useCallback((exitCode: number) => {
    xtermRef.current?.writeln(
      `\r\n\x1b[1;33m[Process exited with code ${exitCode}]\x1b[0m\r\n`
    );
  }, []);

  // WebSocket connection - handles shell I/O and reconnection
  const { isConnected, connect, disconnect, sendInput } = useShellWebSocket({
    sessionId,
    projectId,
    enabled: true,
    onOutput: handleOutput,
    onExit: handleExit,
  });

  // ============================================================================
  // Terminal Initialization
  // ============================================================================
  // Create fresh terminal instance on each mount (no caching/persistence).
  // This follows react-xtermjs pattern: simple, focused, easy to reason about.
  useEffect(() => {
    // Guard against double initialization (StrictMode, HMR)
    if (!terminalRef.current || xtermRef.current) return;

    // Determine if we should use dark theme
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    // Create new terminal instance
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
      scrollback: 10000,
      theme: isDark ? {
        // Dark theme
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
        cursorAccent: "#000000",
        selectionBackground: "#264f78",
        // ANSI colors (16-color palette)
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#ffffff",
      } : {
        // Light theme
        background: "#ffffff",
        foreground: "#000000",
        cursor: "#000000",
        cursorAccent: "#ffffff",
        selectionBackground: "#add6ff",
        // ANSI colors (16-color palette)
        black: "#000000",
        red: "#cd3131",
        green: "#00bc00",
        yellow: "#949800",
        blue: "#0451a5",
        magenta: "#bc05bc",
        cyan: "#0598bc",
        white: "#555555",
        brightBlack: "#666666",
        brightRed: "#cd3131",
        brightGreen: "#14ce14",
        brightYellow: "#b5ba00",
        brightBlue: "#0451a5",
        brightMagenta: "#bc05bc",
        brightCyan: "#0598bc",
        brightWhite: "#a5a5a5",
      },
    });

    xtermRef.current = terminal;

    // Create and load FitAddon
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);

    // Create and load Clipboard addon
    const clipboardAddon = new ClipboardAddon();
    terminal.loadAddon(clipboardAddon);

    // Handle user input - send to WebSocket
    terminal.onData((data) => {
      sendInput(data);
    });

    // Keyboard shortcuts
    terminal.attachCustomKeyEventHandler((event) => {
      // Cmd/Ctrl+C for copy (only when text is selected)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.code === "KeyC" &&
        terminal.hasSelection()
      ) {
        return false; // Let browser handle copy
      }

      // Cmd/Ctrl+V for paste
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyV") {
        return false; // Let browser handle paste
      }

      // Allow all other keys to be handled by terminal
      return true;
    });

    // Open terminal in container and fit
    terminal.open(terminalRef.current);

    // Ensure container has dimensions before fitting
    // This prevents "Cannot read properties of undefined (reading 'dimensions')" error
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        // Focus the terminal so user can start typing immediately
        terminal.focus();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Terminal] Initial fit failed:', error);
        }
        // Retry after a short delay
        setTimeout(() => {
          try {
            fitAddon.fit();
            terminal.focus();
          } catch (retryError) {
            console.error('[Terminal] Fit retry failed:', retryError);
          }
        }, 100);
      }
    });

    // Add session to context (only WebSocket state, no terminal instances)
    addSession(sessionId, {
      projectId,
      status: "disconnected",
    });

    // Connect WebSocket after terminal is initialized and fitted
    // Use setTimeout to ensure DOM is fully ready (fixes dimensions error in some cases)
    const connectTimeout = setTimeout(() => {
      try {
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          connect(dims.cols, dims.rows);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Terminal] Failed to get dimensions for WebSocket connection:', error);
        }
        // Try again after a delay
        setTimeout(() => {
          try {
            const dims = fitAddon.proposeDimensions();
            if (dims) {
              connect(dims.cols, dims.rows);
            }
          } catch (retryError) {
            console.error('[Terminal] Retry failed to get dimensions:', retryError);
          }
        }, 200);
      }
    }, 0);

    // Cleanup on unmount - dispose terminal, disconnect WebSocket, and remove session
    return () => {
      clearTimeout(connectTimeout);
      disconnect();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      removeSession(sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId, theme]); // Re-run if session/project/theme changes

  // ============================================================================
  // Connection Callbacks
  // ============================================================================
  // Notify parent component of connection state changes
  useEffect(() => {
    if (isConnected && onConnect) {
      onConnect();
    } else if (!isConnected && onDisconnect) {
      onDisconnect();
    }
  }, [isConnected, onConnect, onDisconnect]);

  // ============================================================================
  // Render
  // ============================================================================
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="h-full overflow-hidden relative" style={{ backgroundColor: isDark ? "#1e1e1e" : "#ffffff" }}>
      <div
        ref={terminalRef}
        className="h-full w-full p-4"
        style={{ outline: "none" }}
      />
    </div>
  );
}
