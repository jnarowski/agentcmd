import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { api } from "@/client/utils/api";

/**
 * User interface matching the API response
 */
export interface User {
  id: string;
  email: string;
}

/**
 * AuthStore state and actions
 */
export interface AuthStore {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  /**
   * Login with email and password
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if login fails
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Sign up a new user
   * @param email - Email address
   * @param password - Desired password
   * @throws Error if signup fails
   */
  signup: (email: string, password: string) => Promise<void>;

  /**
   * Logout the current user
   */
  logout: () => void;

  /**
   * Set the current user (internal use)
   */
  setUser: (user: User | null) => void;

  /**
   * Set the authentication token (internal use)
   */
  setToken: (token: string | null) => void;

  /**
   * Handle invalid/expired token scenario
   * Clears auth state and navigates to login
   */
  handleInvalidToken: () => void;
}

/**
 * Auth store with localStorage persistence
 * Manages authentication state, login/signup/logout actions
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,

      // Login action
      login: async (email: string, password: string) => {
        try {
          const data = await api.post<{ user: User; token: string }>(
            "/api/auth/login",
            { email, password }
          );

          // Update store with user and token
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          });

          toast.success("Logged in successfully");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Login failed";
          toast.error(message);
          throw error;
        }
      },

      // Signup action
      signup: async (email: string, password: string) => {
        try {
          const data = await api.post<{ user: User; token: string }>(
            "/api/auth/register",
            { email, password }
          );

          // Update store with user and token
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          });

          toast.success("Account created successfully");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Registration failed";
          toast.error(message);
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        toast.success("Logged out successfully");
      },

      // Set user (internal use)
      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      // Set token (internal use)
      setToken: (token: string | null) => {
        set({ token });
      },

      // Handle invalid token
      handleInvalidToken: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        toast.error("Session expired. Please log in again.");
        // Navigation will be handled by the caller since we can't access router here
        // Components should use this in conjunction with useNavigate
      },
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
