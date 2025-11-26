import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/client/utils/cn";

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

function resolvePayloadPath(
  obj: unknown,
  path: string
): string | undefined {
  if (!path || !obj || typeof obj !== "object") {
    return undefined;
  }

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  if (current === null || current === undefined) {
    return String(current);
  }

  if (typeof current === "object") {
    return Array.isArray(current) ? `Array(${current.length})` : "[Object]";
  }

  const stringValue = String(current);
  return stringValue.length > 50
    ? stringValue.substring(0, 50) + "..."
    : stringValue;
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
    return [{ path: prefix, preview: `Array(${obj.length})` }];
  }

  const results: FlattenedPath[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const newPath = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      results.push({ path: newPath, preview: String(value) });
    } else if (typeof value === "object" && !Array.isArray(value)) {
      results.push(
        ...flattenPayload(value, newPath, maxDepth, currentDepth + 1)
      );
    } else if (Array.isArray(value)) {
      results.push({ path: newPath, preview: `Array(${value.length})` });
    } else {
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
  placeholder = "Select a field",
  disabled = false,
}: TokenInputProps) {
  const [open, setOpen] = useState(false);
  const paths = testPayload ? flattenPayload(testPayload) : [];
  const resolvedValue = value && testPayload ? resolvePayloadPath(testPayload, value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <div className="flex items-center justify-between w-full overflow-hidden">
            {value ? (
              <>
                <span className="font-mono text-sm truncate">{value}</span>
                {resolvedValue && (
                  <span className="text-xs text-muted-foreground truncate ml-4 max-w-[200px]">
                    {resolvedValue}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                  keywords={[path, ...path.split("."), preview]}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === path ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-mono text-sm">{path}</span>
                  </div>
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
  );
}
