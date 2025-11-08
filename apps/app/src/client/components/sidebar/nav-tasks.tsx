import { Button } from "@/client/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import { mockTasks } from "./mock-data";

export function NavTasks() {
  // Show all tasks from all projects (global sidebar), increased to 10 for tab view
  const projectTasks = mockTasks.slice(0, 10);

  return (
    <div className="px-2 py-2">
      {projectTasks.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No pending tasks
        </div>
      ) : (
        <SidebarMenu>
          {projectTasks.map((task) => (
            <SidebarMenuItem key={task.id}>
              <div className="flex items-center gap-2 py-0.5">
                <SidebarMenuButton asChild className="flex-1 h-7">
                  <span className="truncate text-sm">{task.title}</span>
                </SidebarMenuButton>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    // TODO: Open NewRunDialog with spec pre-populated
                    console.log("View task:", task.specPath);
                  }}
                >
                  View
                </Button>
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </div>
  );
}
