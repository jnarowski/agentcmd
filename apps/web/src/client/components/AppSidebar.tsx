"use client";

import * as React from "react";
import { useMemo, type ComponentProps } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { useAuthStore } from "@/client/stores/index";

import { Sidebar, useSidebar } from "@/client/components/ui/sidebar";
import { AppSidebarMain } from "@/client/components/AppSidebarMain";
import { AppInnerSidebar } from "@/client/components/AppInnerSidebar";

// Navigation data
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/projects",
      icon: Home,
      isActive: false,
    },
  ],
};

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpen } = useSidebar();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Determine active item based on current location
  const activeItem = useMemo(() => {
    return (
      data.navMain.find((item) => item.url === location.pathname) ||
      data.navMain[0]
    );
  }, [location.pathname]);

  const currentUser = {
    name: user?.email || "Guest User",
    email: user?.email || "",
    avatar: "/avatars/shadcn.jpg",
  };

  const handleNavItemClick = (item: {
    title: string;
    url: string;
    icon: React.ElementType;
    isActive: boolean;
  }) => {
    navigate(item.url);
    setOpen(true);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <AppSidebarMain
        navItems={data.navMain}
        activeItem={activeItem}
        onNavItemClick={handleNavItemClick}
        user={currentUser}
        onLogout={logout}
      />
      <AppInnerSidebar />
    </Sidebar>
  );
}
