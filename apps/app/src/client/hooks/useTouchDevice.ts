import { useState, useEffect } from "react";

/**
 * Detects touch-based interaction to suppress hover menus.
 * Returns true for touch devices/interactions, false for mouse/trackpad.
 *
 * Uses CSS pointer media queries to detect input type:
 * - `(pointer: coarse)` - primary input is touch
 * - `(any-pointer: coarse)` - device has touch capability
 *
 * Also tracks touch events to suppress hover briefly after touch interaction.
 * This handles hybrid devices (like iPad) where user might switch between touch and mouse.
 */
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [recentTouch, setRecentTouch] = useState(false);

  useEffect(() => {
    // CSS pointer queries (primary detection)
    const updatePointer = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const anyCoarse = window.matchMedia("(any-pointer: coarse)").matches;
      const mobileWidth = window.innerWidth < 768;
      setIsTouchDevice(coarse || (anyCoarse && mobileWidth));
    };

    // Track touch events to suppress hover briefly
    let timeout: NodeJS.Timeout;
    const handleTouch = () => {
      setRecentTouch(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setRecentTouch(false), 500);
    };

    updatePointer();

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const anyQuery = window.matchMedia("(any-pointer: coarse)");

    coarseQuery.addEventListener("change", updatePointer);
    anyQuery.addEventListener("change", updatePointer);
    window.addEventListener("resize", updatePointer);
    window.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      clearTimeout(timeout);
      coarseQuery.removeEventListener("change", updatePointer);
      anyQuery.removeEventListener("change", updatePointer);
      window.removeEventListener("resize", updatePointer);
      window.removeEventListener("touchstart", handleTouch);
    };
  }, []);

  return isTouchDevice || recentTouch;
}
