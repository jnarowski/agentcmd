import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/client/components/ui/sidebar";
import { AppSidebarHeader } from "./SidebarHeader";
import { SidebarTabs } from "./SidebarTabs";
import { NavUser } from "./nav-user";
import { useAuthStore } from "@/client/stores/authStore";

interface AppSidebarProps {
  collapsible?: "offcanvas" | "icon" | "none";
  variant?: "sidebar" | "floating" | "inset";
  side?: "left" | "right";
}

export function AppSidebar({
  collapsible = "icon",
  variant = "sidebar",
  side = "left",
  ...props
}: AppSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Mock user data for display
  const userData = {
    name: user?.email?.split("@")[0] || "User",
    email: user?.email || "user@example.com",
    avatar: "",
  };

  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      side={side}
      {...props}
      className="flex flex-col"
    >
      <AppSidebarHeader />
      <SidebarContent className="flex-1 flex flex-col min-h-0">
        <SidebarTabs />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onLogout={logout} />
      </SidebarFooter>
    </Sidebar>
  );
}
