"use client";

import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerSingleProps {
  mode?: "single";
  value?: string; // YYYY-MM-DD format
  onSelectionChange?: (date: string) => void; // Returns YYYY-MM-DD format
  label?: string;
  inputPlaceholder?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  required?: boolean;
  errorMessage?: string;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
  fromYear?: number;
  toYear?: number;
  autoFocus?: boolean;
}

interface DatePickerRangeProps {
  mode: "range";
  value?: string; // "YYYY-MM-DD - YYYY-MM-DD" format
  onSelectionChange?: (dateRange: string) => void; // Returns "YYYY-MM-DD - YYYY-MM-DD" format
  label?: string;
  inputPlaceholder?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  required?: boolean;
  errorMessage?: string;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
  fromYear?: number;
  toYear?: number;
  autoFocus?: boolean;
}

type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

export function DatePicker(props: DatePickerProps) {
  const {
    mode = "single",
    value,
    onSelectionChange,
    label,
    inputPlaceholder = "Select date",
    className,
    inputClassName,
    labelClassName,
    disabled = false,
    required = false,
    errorMessage,
    minDate,
    maxDate,
    fromYear = 1960,
    toYear = 2040,
    autoFocus = false,
  } = props;

  const [open, setOpen] = React.useState(false);

  // Single mode state
  const [singleDate, setSingleDate] = React.useState<Date | undefined>(() => {
    if (mode === "single" && value) {
      const parsed = parse(value, "yyyy-MM-dd", new Date());
      return isValid(parsed) ? parsed : undefined;
    }
    return undefined;
  });

  // Range mode state
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    if (mode === "range" && value) {
      const parts = value.split(" - ");
      if (parts.length === 2) {
        const from = parse(parts[0].trim(), "yyyy-MM-dd", new Date());
        const to = parse(parts[1].trim(), "yyyy-MM-dd", new Date());
        if (isValid(from) && isValid(to)) {
          return { from, to };
        }
      }
    }
    return undefined;
  });

  // Update when value prop changes
  React.useEffect(() => {
    if (mode === "single") {
      if (value) {
        const parsed = parse(value, "yyyy-MM-dd", new Date());
        setSingleDate(isValid(parsed) ? parsed : undefined);
      } else {
        setSingleDate(undefined);
      }
    } else if (mode === "range") {
      if (value) {
        const parts = value.split(" - ");
        if (parts.length === 2) {
          const from = parse(parts[0].trim(), "yyyy-MM-dd", new Date());
          const to = parse(parts[1].trim(), "yyyy-MM-dd", new Date());
          if (isValid(from) && isValid(to)) {
            setDateRange({ from, to });
          }
        }
      } else {
        setDateRange(undefined);
      }
    }
  }, [value, mode]);

  // Handle single date selection
  const handleSingleSelect = (selectedDate: Date | undefined) => {
    setSingleDate(selectedDate);
    if (selectedDate) {
      onSelectionChange?.(format(selectedDate, "yyyy-MM-dd"));
    } else {
      onSelectionChange?.("");
    }
    setOpen(false);
  };

  // Handle range selection with smart logic
  const handleRangeSelect = (range: DateRange | undefined) => {
    // If range is cleared
    if (!range) {
      setDateRange(undefined);
      onSelectionChange?.("");
      return;
    }

    // If only 'from' is selected (first click)
    if (range.from && !range.to) {
      setDateRange(range);
      return;
    }

    // If both 'from' and 'to' are selected
    if (range.from && range.to) {
      setDateRange(range);
      const fromStr = format(range.from, "yyyy-MM-dd");
      const toStr = format(range.to, "yyyy-MM-dd");
      onSelectionChange?.(`${fromStr} - ${toStr}`);
      // Don't auto-close - let user adjust if needed
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "single") {
      setSingleDate(undefined);
    } else {
      setDateRange(undefined);
    }
    onSelectionChange?.("");
  };

  // Convert to display format DD-MM-YYYY
  const displayValue = React.useMemo(() => {
    if (mode === "single") {
      return singleDate ? format(singleDate, "dd-MM-yyyy") : "";
    } else {
      if (dateRange?.from) {
        const fromStr = format(dateRange.from, "dd-MM-yyyy");
        if (dateRange.to) {
          const toStr = format(dateRange.to, "dd-MM-yyyy");
          return `${fromStr} - ${toStr}`;
        }
        return fromStr;
      }
      return "";
    }
  }, [mode, singleDate, dateRange]);

  // Parse min/max dates
  const parsedMinDate = minDate
    ? (() => {
        const parsed = parse(minDate, "yyyy-MM-dd", new Date());
        return isValid(parsed) ? parsed : undefined;
      })()
    : undefined;

  const parsedMaxDate = maxDate
    ? (() => {
        const parsed = parse(maxDate, "yyyy-MM-dd", new Date());
        return isValid(parsed) ? parsed : undefined;
      })()
    : undefined;

  const disabledDays = [];
  if (parsedMinDate) disabledDays.push({ before: parsedMinDate });
  if (parsedMaxDate) disabledDays.push({ after: parsedMaxDate });

  const hasValue = mode === "single" ? !!singleDate : !!(dateRange?.from && dateRange?.to);

  return (
    <div className={className}>
      {label && (
        <div className="flex gap-2 mt-1 pl-2">
          <label
            className={cn(
              "block text-sm font-medium text-gray-700 mb-1",
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {errorMessage && (
            <span className="text-xs font-normal text-red-500 self-center">
              {errorMessage}
            </span>
          )}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              autoFocus={autoFocus}
              className={cn(
                "w-full justify-start text-left font-normal h-10 px-3 pr-20 bg-white border-border text-foreground hover:bg-gray-50",
                !hasValue && "text-muted-foreground",
                errorMessage && "border-red-500",
                inputClassName
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayValue || inputPlaceholder}
            </Button>

            {hasValue && !disabled && (
              <div
                className="absolute right-11 top-1/2 transform -translate-y-1/2 cursor-pointer z-10"
                onClick={handleClear}
                title="Clear date"
              >
                <X size={16} strokeWidth={3} />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {mode === "single" ? (
            <Calendar
              mode="single"
              selected={singleDate}
              onSelect={handleSingleSelect}
              disabled={disabledDays.length > 0 ? disabledDays : undefined}
              initialFocus
              captionLayout="dropdown"
              fromYear={fromYear}
              toYear={toYear}
            />
          ) : (
            <div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleRangeSelect}
                disabled={disabledDays.length > 0 ? disabledDays : undefined}
                initialFocus
                captionLayout="dropdown"
                fromYear={fromYear}
                toYear={toYear}
                numberOfMonths={2}
              />
              {/* Action buttons for range mode */}
              <div className="border-t border-gray-200 p-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateRange(undefined);
                    onSelectionChange?.("");
                  }}
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={!dateRange?.from || !dateRange?.to}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary-dark text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
