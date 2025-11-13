import { Loader2 } from "lucide-react";
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

  // Working state - show streaming indicator with spinning loader
  if (state === "working") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Working</span>
      </Badge>
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
