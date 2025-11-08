"use client";

/**
 * Combobox - A searchable select component with type-safe options and custom rendering
 *
 * @example Basic usage
 * ```tsx
 * const options = [
 *   { value: 'apple', label: 'Apple' },
 *   { value: 'banana', label: 'Banana' }
 * ];
 *
 * <Combobox
 *   value={selectedFruit}
 *   onValueChange={setSelectedFruit}
 *   options={options}
 * />
 * ```
 *
 * @example With custom option rendering
 * ```tsx
 * <Combobox
 *   value={branch}
 *   onValueChange={setBranch}
 *   options={branches}
 *   renderOption={(option, selected) => (
 *     <div className="flex items-center gap-2">
 *       {selected && <CheckIcon />}
 *       <span>{option.label}</span>
 *       {option.badge && <Badge>{option.badge}</Badge>}
 *     </div>
 *   )}
 * />
 * ```
 *
 * @example With custom trigger rendering
 * ```tsx
 * <Combobox
 *   value={user}
 *   onValueChange={setUser}
 *   options={users}
 *   renderTrigger={(selectedOption, open) => (
 *     <div className="flex items-center gap-2">
 *       {selectedOption?.avatar && <Avatar src={selectedOption.avatar} />}
 *       <span>{selectedOption?.label ?? 'Select user...'}</span>
 *       <ChevronIcon className={open ? 'rotate-180' : ''} />
 *     </div>
 *   )}
 * />
 * ```
 */

import { useState, useMemo, type ReactNode } from "react";
import { ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/client/utils/cn";
import { Button } from "@/client/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";

export interface ComboboxOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
}

export interface ComboboxProps<T extends string = string> {
  value?: T;
  onValueChange: (value: T) => void;
  options: readonly ComboboxOption<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  buttonClassName?: string;
  popoverClassName?: string;
  /**
   * Custom render function for the trigger button (selected value display)
   * @param selectedOption - The currently selected option, or undefined if none selected
   * @param open - Whether the popover is open
   */
  renderTrigger?: (selectedOption: ComboboxOption<T> | undefined, open: boolean) => ReactNode;
  /**
   * Custom render function for each option in the dropdown list
   * @param option - The option to render
   * @param selected - Whether this option is currently selected
   */
  renderOption?: (option: ComboboxOption<T>, selected: boolean) => ReactNode;
}

export function Combobox<T extends string = string>({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found",
  disabled = false,
  buttonClassName = "",
  popoverClassName = "",
  renderTrigger,
  renderOption,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const handleSelect = (selectedValue: T) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  const triggerContent = renderTrigger ? (
    renderTrigger(selectedOption, open)
  ) : (
    <>
      {selectedOption?.label || placeholder}
      <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
    </>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedOption && "text-muted-foreground",
            buttonClassName
          )}
          disabled={disabled}
        >
          {triggerContent}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0", popoverClassName)}
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <CommandItem
                    key={String(option.value)}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    {/* @ts-ignore - React type version conflict */}
                    {renderOption ? (
                      renderOption(option, selected)
                    ) : (
                      <div className="flex flex-col flex-1">
                        <span>{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                        {option.badge && (
                          <span className="text-xs text-muted-foreground">
                            {option.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
