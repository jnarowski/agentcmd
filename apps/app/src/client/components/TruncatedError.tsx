import { Tooltip, TooltipContent, TooltipTrigger } from "@/client/components/ui/tooltip";
import { truncateAtWord } from "@/client/utils/truncate";
import { Copy, Check } from "lucide-react";
import { cn } from "@/client/utils/cn";
import { useCopy } from "@/client/hooks/useCopy";

interface TruncatedErrorProps {
  error: string;
  maxLength?: number;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function TruncatedError({
  error,
  maxLength = 150,
  side = "bottom",
  className,
}: TruncatedErrorProps) {
  const { copied, copy } = useCopy();
  const truncated = truncateAtWord(error, maxLength);
  const isTruncated = truncated !== error;

  if (!isTruncated) {
    return <span className={className}>{error}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help", className)}>{truncated}</span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-2xl">
        <div className="space-y-2">
          <pre className="whitespace-pre-wrap break-words text-xs max-w-full">
            {error}
          </pre>
          <button
            onClick={() => copy(error)}
            className="flex items-center gap-1.5 text-xs hover:underline"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy error
              </>
            )}
          </button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
