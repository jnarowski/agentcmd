import { useState, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  badge?: number;
}

export interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedControlOption[];
  className?: string;
  size?: 'default' | 'sm';
}

export function SegmentedControl({
  value,
  onChange,
  options,
  className = '',
  size = 'default',
}: SegmentedControlProps) {
  const [sliderStyle, setSliderStyle] = useState<{
    width: number;
    left: number;
  }>({ width: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Update slider position when value changes
  useEffect(() => {
    const activeButton = optionRefs.current.get(value);
    const container = containerRef.current;

    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setSliderStyle({
        width: buttonRect.width,
        left: buttonRect.left - containerRect.left,
      });
    }
  }, [value, options]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = options.length - 1;
        break;
      default:
        return;
    }

    const newValue = options[newIndex].value;
    onChange(newValue);

    // Focus the new button
    const newButton = optionRefs.current.get(newValue);
    if (newButton) {
      newButton.focus();
    }
  };

  const containerPadding = size === 'sm' ? 'p-0.5' : 'p-1';
  const buttonPadding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1.5';
  const buttonGap = size === 'sm' ? 'gap-1.5' : 'gap-2';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 rounded-lg bg-muted ${containerPadding} ${className}`}
      role="radiogroup"
      aria-label="View mode selector"
    >
      {/* Sliding background */}
      <div
        className={`absolute ${size === 'sm' ? 'h-[calc(100%-4px)]' : 'h-[calc(100%-8px)]'} rounded-md bg-background shadow-sm transition-all duration-200 ease-out`}
        style={{
          width: sliderStyle.width,
          transform: `translateX(${sliderStyle.left}px)`,
        }}
      />

      {/* Options */}
      {options.map((option, index) => {
        const isActive = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            ref={(el) => {
              if (el) {
                optionRefs.current.set(option.value, el);
              } else {
                optionRefs.current.delete(option.value);
              }
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            tabIndex={isActive ? 0 : -1}
            className={`relative z-10 flex items-center ${buttonGap} rounded-md ${buttonPadding} ${fontSize} font-medium transition-colors ${
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {Icon && <Icon className={iconSize} />}
            <span>{option.label}</span>
            {option.badge !== undefined && option.badge > 0 && (
              <span
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                }`}
              >
                {option.badge > 99 ? '99+' : option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
