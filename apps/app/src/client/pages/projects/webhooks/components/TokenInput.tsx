import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  testPayload?: Record<string, unknown> | null;
  placeholder?: string;
  disabled?: boolean;
}

interface FlattenedPath {
  path: string;
  preview: string;
}

function flattenPayload(
  obj: unknown,
  prefix = "",
  maxDepth = 10,
  currentDepth = 0
): FlattenedPath[] {
  if (currentDepth >= maxDepth) {
    return [];
  }

  if (obj === null || obj === undefined) {
    return [{ path: prefix || "value", preview: String(obj) }];
  }

  if (typeof obj !== "object") {
    return [{ path: prefix || "value", preview: String(obj) }];
  }

  if (Array.isArray(obj)) {
    // For arrays, just show the count, don't flatten items
    return [{ path: prefix, preview: `Array(${obj.length})` }];
  }

  const results: FlattenedPath[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const newPath = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      results.push({ path: newPath, preview: String(value) });
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // Recurse for nested objects
      results.push(...flattenPayload(value, newPath, maxDepth, currentDepth + 1));
    } else if (Array.isArray(value)) {
      results.push({ path: newPath, preview: `Array(${value.length})` });
    } else {
      // Primitive value
      const previewValue = String(value);
      const truncated =
        previewValue.length > 50
          ? previewValue.substring(0, 50) + "..."
          : previewValue;
      results.push({ path: newPath, preview: truncated });
    }
  }

  return results;
}

export function TokenInput({
  value,
  onChange,
  testPayload,
  placeholder = "Enter value or / to pick token",
  disabled = false,
}: TokenInputProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const paths = testPayload ? flattenPayload(testPayload) : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "/" && !disabled) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleSelect = (path: string) => {
    onChange(`{{${path}}}`);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !testPayload}
            title={testPayload ? "Pick token from test payload" : "Send test event first"}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search fields..." />
            <CommandList>
              <CommandEmpty>No fields found.</CommandEmpty>
              <CommandGroup heading="Available Fields">
                {paths.map(({ path, preview }) => (
                  <CommandItem
                    key={path}
                    value={path}
                    onSelect={() => handleSelect(path)}
                    className="flex justify-between gap-4"
                  >
                    <span className="font-mono text-sm">{path}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {preview}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
