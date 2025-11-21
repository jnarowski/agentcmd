import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/client/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  size?: "sm" | "xs";
}

/**
 * Breadcrumb navigation component
 *
 * @example
 * ```tsx
 * <Breadcrumb items={[
 *   { label: "Project", href: `/projects/${projectId}` },
 *   { label: "Webhooks", href: `/projects/${projectId}/webhooks` },
 *   { label: "Webhook Name" } // No href = current page
 * ]} />
 * ```
 */
export function Breadcrumb({ items, className, size = "sm" }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const sizeClasses = {
    sm: "text-sm gap-2",
    xs: "text-xs gap-1.5",
  };

  const iconSize = size === "xs" ? "w-3 h-3" : "w-4 h-4";

  return (
    <nav
      className={cn(
        "flex items-center text-muted-foreground",
        sizeClasses[size],
        className
      )}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className={cn("flex items-center", size === "xs" ? "gap-1.5" : "gap-2")}>
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast && "text-foreground font-medium"
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className={iconSize} />}
          </div>
        );
      })}
    </nav>
  );
}
