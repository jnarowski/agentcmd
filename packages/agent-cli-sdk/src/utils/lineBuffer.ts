/**
 * Creates a line buffering handler for streaming JSONL data
 *
 * Accumulates chunks and only emits complete lines, handling cases where
 * streaming data arrives split mid-line.
 *
 * @param onLine - Callback invoked for each complete line
 * @returns Object with add() and flush() methods
 *
 * @example
 * const buffer = createLineBuffer((line) => {
 *   const event = JSON.parse(line);
 *   console.log(event);
 * });
 *
 * buffer.add('{"type":"mes');  // Incomplete - buffered
 * buffer.add('sage"}\n');      // Complete - emits line
 * buffer.flush();              // Emit any remaining data
 */
export function createLineBuffer(onLine: (line: string) => void) {
  let buffer = '';

  return {
    /**
     * Add a chunk of streaming data
     * Emits complete lines immediately, buffers incomplete lines
     */
    add(chunk: string): void {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep last incomplete line

      for (const line of lines) {
        if (line.trim()) {
          // Skip empty lines
          onLine(line);
        }
      }
    },

    /**
     * Flush any remaining buffered data
     * Call this when the stream ends to emit the final incomplete line
     */
    flush(): void {
      if (buffer.trim()) {
        onLine(buffer);
        buffer = '';
      }
    },
  };
}
