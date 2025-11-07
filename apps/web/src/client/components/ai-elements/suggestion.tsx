'use client';

import { type ReactNode } from 'react';
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/utils/cn";

interface SuggestionsProps {
  children: ReactNode;
  className?: string;
}

export const Suggestions = ({ children, className }: SuggestionsProps) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {children}
    </div>
  );
};

interface SuggestionProps {
  suggestion: string;
  onClick: () => void;
}

export const Suggestion = ({ suggestion, onClick }: SuggestionProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-auto whitespace-normal text-left py-2 px-3"
    >
      {suggestion}
    </Button>
  );
};
