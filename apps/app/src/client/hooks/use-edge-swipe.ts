import { useDrag } from "@use-gesture/react";
import { useRef } from "react";
import { useIsMobile } from "@/client/hooks/use-mobile";

// PUBLIC API

export interface UseEdgeSwipeOptions {
  /** Callback triggered when swipe threshold is met */
  onSwipe: () => void;
  /** Width of edge zone in pixels (default: 100) */
  edgeWidth?: number;
  /** Horizontal movement threshold in pixels (default: 100) */
  threshold?: number;
  /** Velocity threshold for fast swipe (default: 0.5) */
  velocity?: number;
}

/**
 * Custom hook for detecting left-to-right swipe gestures from screen edge.
 *
 * Only activates when gesture starts within the edge zone (< edgeWidth from left).
 * Triggers callback when either movement threshold or velocity threshold is exceeded.
 * Prevents iOS Safari back navigation by calling preventDefault on touchstart.
 *
 * @example
 * ```tsx
 * const bind = useEdgeSwipe({
 *   onSwipe: () => setOpenMobile(true),
 *   edgeWidth: 100,
 *   threshold: 100,
 *   velocity: 0.5
 * });
 *
 * return <div {...bind()} />;
 * ```
 */
export function useEdgeSwipe(options: UseEdgeSwipeOptions) {
  const {
    onSwipe,
    edgeWidth = 100,
    threshold = 100,
    velocity: velocityThreshold = 0.5,
  } = options;

  const isMobile = useIsMobile();
  const triggered = useRef(false);

  const bind = useDrag(
    ({ event, initial, movement, velocity, last }) => {
      // Reset trigger state on gesture end
      if (last) {
        triggered.current = false;
        return;
      }

      // Only detect gestures starting from left edge
      const startX = initial[0];
      if (startX >= edgeWidth) {
        return;
      }

      // Prevent Safari back navigation on left-edge horizontal swipes
      if (event && "preventDefault" in event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      // Prevent multiple triggers during same gesture
      if (triggered.current) {
        return;
      }

      // Check if horizontal movement exceeds threshold (left-to-right only)
      const horizontalDelta = movement[0];
      const horizontalVelocity = velocity[0];

      // Trigger on movement threshold OR positive velocity threshold
      if (
        horizontalDelta > threshold ||
        (horizontalVelocity > velocityThreshold && horizontalVelocity > 0)
      ) {
        triggered.current = true;
        onSwipe();
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
      enabled: isMobile,
      preventDefault: true,
    }
  );

  return bind;
}
