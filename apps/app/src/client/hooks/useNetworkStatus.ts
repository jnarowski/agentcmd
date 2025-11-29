import { useEffect, useState } from "react";

/**
 * Hook to detect network online/offline status
 * Listens to browser online/offline events and returns current state
 *
 * @returns boolean indicating if browser is online
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize from navigator.onLine
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true; // Default to online for SSR
  });

  useEffect(() => {
    const handleOnline = () => {
      console.log("[Network] 🌐 Network online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("[Network] 📡 Network offline");
      setIsOnline(false);
    };

    // Listen for network events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
