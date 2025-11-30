import { useState, useCallback } from "react";

interface UseCopyOptions {
  /** Duration in ms to show copied state (default: 2000) */
  timeout?: number;
}

interface UseCopyReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

/**
 * Hook for copying text to clipboard with copied state feedback
 */
export function useCopy(options: UseCopyOptions = {}): UseCopyReturn {
  const { timeout = 2000 } = options;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    },
    [timeout]
  );

  return { copied, copy };
}
