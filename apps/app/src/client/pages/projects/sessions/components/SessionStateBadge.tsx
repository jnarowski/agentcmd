import { Radio } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";

interface SessionStateBadgeProps {
  state: "idle" | "working" | "error";
  errorMessage?: string | null;
}

export function SessionStateBadge({
  state,
  errorMessage,
}: SessionStateBadgeProps) {
  // Don't show badge for idle state (clean default)
  if (state === "idle") {
    return null;
  }

  // Working state - show streaming indicator with pulse animation
  if (state === "working") {
    return (
      <div className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
        <Radio className="h-3.5 w-3.5 animate-pulse" />
        <span>Streaming</span>
      </div>
    );
  }

  // Error state - show red badge with tooltip
  if (state === "error") {
    const errorText = errorMessage || "An error occurred";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive">Error</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="text-sm">{errorText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
