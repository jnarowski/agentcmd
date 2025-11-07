'use client';

import { useState, Children, isValidElement, cloneElement, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";

interface ReasoningProps {
  children: ReactNode;
  duration?: number;
}

export const Reasoning = ({ children, duration }: ReasoningProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
        {Children.map(children, (child) => {
          if (isValidElement(child)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return cloneElement(child, { duration, isOpen } as any);
          }
          return child;
        })}
      </div>
    </Collapsible>
  );
};

interface ReasoningTriggerProps {
  duration?: number;
  isOpen?: boolean;
}

export const ReasoningTrigger = ({ duration, isOpen }: ReasoningTriggerProps) => {
  return (
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="sm" className="w-full justify-between h-auto p-0 hover:bg-transparent">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="font-medium">Reasoning</span>
          {duration && (
            <span className="text-xs text-muted-foreground">
              ({duration}s)
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </CollapsibleTrigger>
  );
};

interface ReasoningContentProps {
  children: ReactNode;
}

export const ReasoningContent = ({ children }: ReasoningContentProps) => {
  return (
    <CollapsibleContent>
      <div className="pt-2 text-sm text-muted-foreground whitespace-pre-wrap">
        {children}
      </div>
    </CollapsibleContent>
  );
};
