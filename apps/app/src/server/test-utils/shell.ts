import { vi } from "vitest";
import type { IPty } from "node-pty";

/**
 * Create a mock IPty process for testing
 */
export function createMockPty(): IPty {
  return {
    pid: 12345,
    cols: 80,
    rows: 24,
    process: "bash",
    handleFlowControl: false,
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    emit: vi.fn(),
    listeners: vi.fn().mockReturnValue([]),
    listenerCount: vi.fn().mockReturnValue(0),
    prependListener: vi.fn(),
    prependOnceListener: vi.fn(),
    eventNames: vi.fn().mockReturnValue([]),
    setMaxListeners: vi.fn(),
    getMaxListeners: vi.fn().mockReturnValue(10),
    rawListeners: vi.fn().mockReturnValue([]),
    write: vi.fn(),
    resize: vi.fn(),
    clear: vi.fn(),
    kill: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn(),
  } as unknown as IPty;
}

/**
 * Mock node-pty module with controlled spawn behavior
 */
export function mockNodePty() {
  const mockPty = createMockPty();

  vi.doMock("node-pty", () => ({
    spawn: vi.fn().mockReturnValue(mockPty),
  }));

  return { mockPty };
}

/**
 * Verify that a PTY process was killed
 */
export function expectPtyKilled(ptyProcess: IPty) {
  expect(ptyProcess.kill).toHaveBeenCalled();
}
