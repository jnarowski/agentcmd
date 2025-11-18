import { Button } from "@/client/components/ui/button";
import { SidebarMenu } from "@/client/components/ui/sidebar";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { RefreshCw, Loader2 } from "lucide-react";
import { useNavigationStore } from "@/client/stores";
import { SpecItem } from "@/client/components/sidebar/SpecItem";

export function NavSpecs() {
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);

  // Use activeProjectId from navigationStore for filtering
  const { data, isLoading, error } = useSpecs(activeProjectId || undefined);
  const rescanMutation = useRescanSpecs();

  const handleRescan = () => {
    rescanMutation.mutate();
  };

  if (error) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          <div className="py-4 text-center text-sm text-destructive">
            Failed to load specs
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Loading specs...
          </div>
        ) : (
          <>
            {/* Tasks (Specs) */}
            {data && data.specs.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Specs
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={handleRescan}
                    disabled={rescanMutation.isPending || isLoading}
                    aria-label="Refresh specs"
                  >
                    {rescanMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                  </Button>
                </div>
                <SidebarMenu className="mb-4">
                  {data.specs.map((spec) => (
                    <SpecItem key={spec.id} spec={spec} />
                  ))}
                </SidebarMenu>
              </>
            )}

            {/* Empty state */}
            {data && data.specs.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {activeProjectId ? "No specs in this project" : "No specs"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
