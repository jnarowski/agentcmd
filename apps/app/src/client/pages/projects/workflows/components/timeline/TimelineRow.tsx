import type { ReactNode } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/client/components/ui/tooltip";

interface TimelineRowProps {
  icon: ReactNode;
  tooltipLabel: string;
  children: ReactNode;
  rightContent?: ReactNode;
  onClick?: () => void;
}

export function TimelineRow({ icon, tooltipLabel, children, rightContent, onClick }: TimelineRowProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Fixed 40px Icon Container with Tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-10 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Right Metadata */}
      {rightContent && (
        <div className="flex-shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
}
