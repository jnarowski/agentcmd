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
      className={`flex items-start gap-2 md:gap-3 p-3 hover:bg-accent/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Responsive Icon Container with Tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-8 md:w-10 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
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

      {/* Right Metadata - hide on mobile if needed */}
      {rightContent && (
        <div className="flex-shrink-0 hidden md:block">
          {rightContent}
        </div>
      )}
    </div>
  );
}
