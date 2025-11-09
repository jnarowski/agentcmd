import { Search, X } from "lucide-react";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";

export interface FileTreeSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
}

/**
 * Search input component for FileTree.
 *
 * Displays a search input with clear button for filtering file tree items.
 * Features:
 * - Search icon on left
 * - Clear button on right (when query exists)
 * - Responsive styling
 *
 * @param props.searchQuery - Current search query
 * @param props.onSearchChange - Callback when search query changes
 * @param props.onClearSearch - Callback when clear button clicked
 */
export function FileTreeSearch({
  searchQuery,
  onSearchChange,
  onClearSearch,
}: FileTreeSearchProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b">
      <div className="flex items-center gap-2 flex-1 relative">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSearch}
            className="absolute right-1 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
