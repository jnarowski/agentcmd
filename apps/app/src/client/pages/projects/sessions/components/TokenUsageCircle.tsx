import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";

interface TokenUsageCircleProps {
  totalTokens: number;
  currentMessageTokens?: number;
}

function formatTokens(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  return (count / 1000).toFixed(1) + "k";
}

export function TokenUsageCircle({
  totalTokens,
  currentMessageTokens,
}: TokenUsageCircleProps) {
  const formattedCount = formatTokens(totalTokens);
  const fullCount = totalTokens.toLocaleString();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {formattedCount}
            {currentMessageTokens !== undefined && (
              <span data-testid="message-tokens">+{currentMessageTokens}</span>
            )}
          </span>
          <div className="hidden md:block h-6 w-6 rounded-full border-2 border-muted-foreground/30 bg-background" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {fullCount} tokens
          {currentMessageTokens !== undefined &&
            ` (+${currentMessageTokens} in message)`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
