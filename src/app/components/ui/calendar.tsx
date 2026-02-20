"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium text-text-primary",
        nav: "flex items-center gap-1",
        nav_button:
          "inline-flex items-center justify-center size-8 rounded-md border border-border-subtle bg-bg-elevated text-text-muted hover:bg-accent-green/20 hover:text-accent-green transition-colors",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "text-text-muted rounded-md w-9 font-medium text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent-green/15 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: "inline-flex items-center justify-center size-9 p-0 font-normal text-text-primary rounded-md hover:bg-bg-elevated cursor-pointer transition-colors aria-selected:opacity-100",
        day_range_start:
          "day-range-start aria-selected:bg-accent-green aria-selected:text-white",
        day_range_end:
          "day-range-end aria-selected:bg-accent-green aria-selected:text-white",
        day_selected:
          "bg-accent-green text-white hover:bg-accent-green hover:text-white focus:bg-accent-green focus:text-white font-bold",
        day_today: "bg-bg-elevated text-text-primary font-bold",
        day_outside:
          "day-outside text-text-muted/40 aria-selected:text-white/70",
        day_disabled: "text-text-muted/30 cursor-not-allowed hover:bg-transparent",
        day_range_middle:
          "aria-selected:bg-accent-green/15 aria-selected:text-text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
