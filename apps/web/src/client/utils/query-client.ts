import { QueryClient } from "@tanstack/react-query";

/**
 * Configure React Query client with sensible defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 1 minute
      staleTime: 1000 * 60,
      // Cache data for 5 minutes
      gcTime: 1000 * 60 * 5,
      // Retry failed queries 1 time
      retry: 1,
      // Don't refetch on window focus by default (can override per-query)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
