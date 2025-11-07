/**
 * Central export point for all Zustand stores
 *
 * Usage:
 * ```typescript
 * import { useAuthStore, useNavigationStore, useFilesStore } from '@/client/stores';
 *
 * // In a component:
 * const user = useAuthStore(state => state.user);
 * const login = useAuthStore(state => state.login);
 * ```
 */

// Store exports
export { useAuthStore } from "./authStore";
export { useNavigationStore } from "./navigationStore";
export { useFilesStore } from "@/client/pages/projects/files/stores/filesStore";

// Type exports
export type { AuthStore, User } from "./authStore";
export type { NavigationStore } from "./navigationStore";
export type { FilesStore } from "@/client/pages/projects/files/stores/filesStore";
