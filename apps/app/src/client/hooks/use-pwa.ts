import { useState, useEffect } from "react";

// iOS-specific Navigator extension
interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

export function useIsPwa() {
  const [isPwa, setIsPwa] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // iOS-specific check
    const isIOSStandalone = (window.navigator as IOSNavigator).standalone === true;

    // Cross-platform check (modern standard)
    const mql = window.matchMedia("(display-mode: standalone)");
    const isStandalone = mql.matches || isIOSStandalone;

    setIsPwa(isStandalone);

    // Listen for display-mode changes
    const onChange = () => {
      setIsPwa(mql.matches || (window.navigator as IOSNavigator).standalone === true);
    };

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isPwa;
}
