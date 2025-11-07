import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <DropdownMenuItem onClick={() => setTheme("light")}>
        <Sun className="h-4 w-4" />
        Light
        {theme === "light" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")}>
        <Moon className="h-4 w-4" />
        Dark
        {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("system")}>
        <Monitor className="h-4 w-4" />
        System
        {theme === "system" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
    </>
  );
}
