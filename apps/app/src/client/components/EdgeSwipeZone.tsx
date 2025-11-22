import { useEdgeSwipe } from "@/client/hooks/use-edge-swipe";
import { useSidebar } from "@/client/components/ui/sidebar";
import { useIsMobile } from "@/client/hooks/use-mobile";

/**
 * Invisible edge zone component that detects left-to-right swipe gestures.
 *
 * Only renders on mobile when sidebar is closed.
 * Fixed position at left edge, 40px width, full viewport height.
 * Uses touch-action: pan-y to allow vertical scroll while capturing horizontal swipe.
 */
export default function EdgeSwipeZone() {
  const { setOpenMobile, openMobile } = useSidebar();
  const isMobile = useIsMobile();

  const bind = useEdgeSwipe({
    onSwipe: () => setOpenMobile(true),
    edgeWidth: 40,
    threshold: 100,
    velocity: 0.5,
  });

  // Only render on mobile when sidebar is closed
  if (!isMobile || openMobile) {
    return null;
  }

  return (
    <div
      {...bind()}
      className="fixed left-0 top-0 h-screen w-[40px] z-40"
      style={{ touchAction: "pan-y" }}
      aria-hidden="true"
    />
  );
}
