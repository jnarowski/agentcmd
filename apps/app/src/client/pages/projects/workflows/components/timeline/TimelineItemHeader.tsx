import { useDebugMode } from "@/client/hooks/useDebugMode";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";
import { formatDuration } from "../../utils/formatDuration";

interface TimelineItemHeaderProps {
  title: string | React.ReactNode;
  titleClassName?: string;
  date: string;
  duration?: number | null;
  id?: string;
  errorMessage?: string | null;
  truncate?: boolean;
}

export function TimelineItemHeader({
  title,
  titleClassName = "text-workflow-row-title text-base font-medium",
  date,
  duration,
  id,
  errorMessage,
  truncate = false,
}: TimelineItemHeaderProps) {
  const debugMode = useDebugMode();

  // Render title with optional truncation
  const renderTitle = () => {
    // ReactNode - render as-is (user handles all styling)
    if (typeof title !== "string") {
      return title;
    }

    // String with truncation
    if (truncate) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`${titleClassName} truncate min-w-0`}>
              {title}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-md wrap-break-word">
            {title}
          </TooltipContent>
        </Tooltip>
      );
    }

    // String without truncation
    return <span className={titleClassName}>{title}</span>;
  };

  return (
    <div>
      {/* Title + Debug ID */}
      <div className="flex items-center gap-2">
        {renderTitle()}
        {debugMode && id && (
          <span className="text-xs text-muted-foreground font-mono">
            [{id}]
          </span>
        )}
      </div>

      {/* Date + Duration */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
        <span>{date}</span>
        {duration && (
          <>
            <span>•</span>
            <span>{formatDuration(duration)}</span>
          </>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="text-xs text-red-500 mt-1">{errorMessage}</div>
      )}
    </div>
  );
}
