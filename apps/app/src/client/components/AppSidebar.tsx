"use client";

import type { ComponentProps } from "react";
import { Sidebar } from "@/client/components/ui/sidebar";
import { AppSidebar as UnifiedAppSidebar } from "@/client/components/sidebar/AppSidebar";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return <UnifiedAppSidebar {...props} />;
}
