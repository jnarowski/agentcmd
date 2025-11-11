import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/client/components/ui/collapsible";

export interface WorkflowAccordionSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  hideIfEmpty?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
}

export function WorkflowAccordionSection({
  title,
  count,
  children,
  defaultOpen = false,
  hideIfEmpty = false,
  icon: Icon,
  iconClassName,
}: WorkflowAccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Hide section if empty and hideIfEmpty is true
  if (hideIfEmpty && count === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {Icon && <Icon className={`h-5 w-5 ${iconClassName || ""}`} />}
              <h2 className="text-lg font-semibold">{title}</h2>
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary/10 px-2 text-sm font-medium text-primary">
                {count}
              </span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">
            <div className="space-y-3">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
