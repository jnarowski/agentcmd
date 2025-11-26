import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

interface BreadcrumbSectionProps {
  items: BreadcrumbItem[];
}

/**
 * Full-width breadcrumb section with bottom border
 *
 * Use this at the top of pages to show navigation hierarchy.
 *
 * @example
 * ```tsx
 * <BreadcrumbSection
 *   items={[
 *     { label: "Project", href: `/projects/${projectId}` },
 *     { label: "Workflows", href: `/projects/${projectId}/workflows` },
 *     { label: "Workflow Name" }
 *   ]}
 * />
 * ```
 */
export function BreadcrumbSection({ items }: BreadcrumbSectionProps) {
  return (
    <div className="hidden sm:block border-b border-border/40 bg-background px-4 py-2">
      <Breadcrumb items={items} size="xs" />
    </div>
  );
}
