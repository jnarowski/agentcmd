import { BreadcrumbSection } from "./ui/breadcrumb-section";
import type { BreadcrumbItem } from "./ui/breadcrumb";
import { cn } from "@/client/utils/cn";

export interface PageHeaderProps {
  /** Breadcrumb items - renders BreadcrumbSection above header if provided */
  breadcrumbs?: BreadcrumbItem[];
  /** Page title (h1) */
  title: string;
  /** Optional description text below title */
  description?: string;
  /** Action buttons displayed on the right side */
  actions?: React.ReactNode;
  /** Content displayed inline after title (badges, status, links) */
  afterTitle?: React.ReactNode;
  /** Content displayed below title section (tabs, filters) */
  belowHeader?: React.ReactNode;
  /** Alert/error messages displayed at bottom of header */
  alerts?: React.ReactNode;
  /** Additional CSS classes for header container */
  className?: string;
}

/**
 * Shared page header component with breadcrumbs, title, description, and actions
 *
 * Provides consistent layout and styling across all pages.
 *
 * @example
 * Basic usage:
 * ```tsx
 * <PageHeader
 *   breadcrumbs={[
 *     { label: "Project", href: `/projects/${projectId}` },
 *     { label: "Workflows" }
 *   ]}
 *   title="Workflows"
 *   description="View workflow runs across all workflow definitions"
 *   actions={<Button onClick={handleClick}>New Run</Button>}
 * />
 * ```
 *
 * @example
 * With tabs below header:
 * ```tsx
 * <PageHeader
 *   breadcrumbs={[...]}
 *   title="Workflows"
 *   belowHeader={<WorkflowTabs />}
 * />
 * ```
 *
 * @example
 * With inline badges and alerts:
 * ```tsx
 * <PageHeader
 *   breadcrumbs={[...]}
 *   title="Run Name"
 *   afterTitle={<WorkflowStatusBadge status={run.status} />}
 *   alerts={<Alert>Error message</Alert>}
 * />
 * ```
 */
export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  afterTitle,
  belowHeader,
  alerts,
  className,
}: PageHeaderProps) {
  return (
    <>
      {/* Breadcrumbs */}
      {breadcrumbs && <BreadcrumbSection items={breadcrumbs} />}

      {/* Header */}
      <div className={cn("border-b bg-background px-4 py-4", className)}>
        {/* Title and badges */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate min-w-0">{title}</h1>
          {afterTitle && <div className="flex-shrink-0">{afterTitle}</div>}
        </div>

        {/* Actions */}
        {actions && <div className="hidden md:flex items-center gap-2 mt-3">{actions}</div>}

        {/* Description */}
        {description && (
          <p className="hidden md:block text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}

        {/* Below header content (tabs, filters) */}
        {belowHeader && <div className="mt-4">{belowHeader}</div>}

        {/* Alerts */}
        {alerts && <div className="mt-3">{alerts}</div>}
      </div>
    </>
  );
}
