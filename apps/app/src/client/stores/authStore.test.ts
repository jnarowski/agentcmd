import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "./authStore";

// Mock fetch globally
global.fetch = vi.fn();

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("authStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    // Clear localStorage
    localStorage.clear();
    // Reset mocks
    vi.clearAllMocks();
  });

  it("should have initial state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should login successfully", async () => {
    const mockUser = { id: "1", username: "testuser" };
    const mockToken = "test-token";

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: mockUser,
        token: mockToken,
      }),
    });

    await useAuthStore.getState().login("testuser", "password");

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it("should handle login failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({
        error: {
          message: "Invalid credentials",
          statusCode: 401
        }
      }),
    });

    await expect(
      useAuthStore.getState().login("testuser", "wrongpassword")
    ).rejects.toThrow("Invalid credentials");

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should signup successfully", async () => {
    const mockUser = { id: "1", username: "newuser" };
    const mockToken = "new-token";

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: mockUser,
        token: mockToken,
      }),
    });

    await useAuthStore.getState().signup("newuser", "password");

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it("should logout and clear state", () => {
    // Set some initial state
    useAuthStore.setState({
      user: { id: "1", username: "testuser" },
      token: "test-token",
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should handle invalid token", () => {
    // Set some initial state
    useAuthStore.setState({
      user: { id: "1", username: "testuser" },
      token: "test-token",
      isAuthenticated: true,
    });

    useAuthStore.getState().handleInvalidToken();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should persist to localStorage", async () => {
    const mockUser = { id: "1", username: "testuser" };
    const mockToken = "test-token";

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: mockUser,
        token: mockToken,
      }),
    });

    await useAuthStore.getState().login("testuser", "password");

    // Check localStorage
    const stored = localStorage.getItem("auth-storage");
    expect(stored).toBeTruthy();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.user).toEqual(mockUser);
      expect(parsed.state.token).toBe(mockToken);
    }
  });

  it("should set user directly", () => {
    const mockUser = { id: "1", username: "testuser" };

    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it("should set token directly", () => {
    useAuthStore.getState().setToken("new-token");

    const state = useAuthStore.getState();
    expect(state.token).toBe("new-token");
  });
});
