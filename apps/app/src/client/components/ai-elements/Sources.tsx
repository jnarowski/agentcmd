'use client';

import { useState, Children, isValidElement, cloneElement, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react';
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";

interface SourcesProps {
  children: ReactNode;
}

export const Sources = ({ children }: SourcesProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        {Children.map(children, (child) => {
          if (isValidElement(child)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return cloneElement(child, { isOpen } as any);
          }
          return child;
        })}
      </div>
    </Collapsible>
  );
};

interface SourcesTriggerProps {
  count: number;
  isOpen?: boolean;
}

export const SourcesTrigger = ({ count, isOpen }: SourcesTriggerProps) => {
  return (
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{count} source{count !== 1 ? 's' : ''}</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </div>
      </Button>
    </CollapsibleTrigger>
  );
};

interface SourcesContentProps {
  children: ReactNode;
}

export const SourcesContent = ({ children }: SourcesContentProps) => {
  return (
    <CollapsibleContent>
      <div className="mt-2 space-y-2">
        {children}
      </div>
    </CollapsibleContent>
  );
};

interface SourceProps {
  href: string;
  title: string;
}

export const Source = ({ href, title }: SourceProps) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm transition-colors hover:bg-accent"
    >
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{title}</span>
    </a>
  );
};
