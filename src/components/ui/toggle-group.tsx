"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ToggleGroupOption {
  value: string;
  label: string;
}

export interface ToggleGroupProps {
  options: ToggleGroupOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  className?: string;
}

function ToggleGroup({ options, value, onChange, className }: ToggleGroupProps) {
  const isMulti = Array.isArray(value);

  const isActive = (optionValue: string) => {
    if (isMulti) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handleClick = (optionValue: string) => {
    if (isMulti) {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-muted p-1",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleClick(option.value)}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isActive(option.value)
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export { ToggleGroup };
