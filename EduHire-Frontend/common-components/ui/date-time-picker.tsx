"use client";

import { format, parse, isValid, set } from "date-fns";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string; // ISO 8601 format
  onSelectionChange?: (datetime: string) => void; // Returns ISO 8601 format
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

export function DateTimePicker({
  value,
  onSelectionChange,
  label,
  inputPlaceholder = "Select date and time",
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
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(() => {
    if (value) {
      const parsed = new Date(value);
      return isValid(parsed) ? parsed : undefined;
    }
    return undefined;
  });

  // Time states
  const [hours, setHours] = React.useState<string>(() => {
    if (value) {
      const date = new Date(value);
      return isValid(date) ? format(date, "hh") : "12";
    }
    return "12";
  });

  const [minutes, setMinutes] = React.useState<string>(() => {
    if (value) {
      const date = new Date(value);
      return isValid(date) ? format(date, "mm") : "00";
    }
    return "00";
  });

  const [period, setPeriod] = React.useState<"AM" | "PM">(() => {
    if (value) {
      const date = new Date(value);
      return isValid(date) ? (format(date, "a") as "AM" | "PM") : "AM";
    }
    return "AM";
  });

  React.useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (isValid(parsed)) {
        setSelectedDate(parsed);
        setHours(format(parsed, "hh"));
        setMinutes(format(parsed, "mm"));
        setPeriod(format(parsed, "a") as "AM" | "PM");
      }
    } else {
      setSelectedDate(undefined);
      setHours("12");
      setMinutes("00");
      setPeriod("AM");
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Apply current time to the selected date
      const hour24 = period === "PM" && hours !== "12"
        ? parseInt(hours) + 12
        : period === "AM" && hours === "12"
        ? 0
        : parseInt(hours);

      const newDateTime = set(date, {
        hours: hour24,
        minutes: parseInt(minutes),
        seconds: 0,
        milliseconds: 0,
      });

      setSelectedDate(newDateTime);
      onSelectionChange?.(newDateTime.toISOString());
    }
  };

  const handleTimeChange = (newHours: string, newMinutes: string, newPeriod: "AM" | "PM") => {
    if (!selectedDate) return;

    const hour24 = newPeriod === "PM" && newHours !== "12"
      ? parseInt(newHours) + 12
      : newPeriod === "AM" && newHours === "12"
      ? 0
      : parseInt(newHours);

    const newDateTime = set(selectedDate, {
      hours: hour24,
      minutes: parseInt(newMinutes),
      seconds: 0,
      milliseconds: 0,
    });

    setSelectedDate(newDateTime);
    onSelectionChange?.(newDateTime.toISOString());
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(undefined);
    setHours("12");
    setMinutes("00");
    setPeriod("AM");
    onSelectionChange?.("");
  };

  const handleDone = () => {
    setOpen(false);
  };

  // Convert to display format DD-MM-YYYY HH:MM AM/PM
  const displayValue = selectedDate
    ? `${format(selectedDate, "dd-MM-yyyy")} ${format(selectedDate, "hh:mm a")}`
    : "";

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

  // Generate hours 01-12
  const generateHours = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const hour = i + 1;
      return hour.toString().padStart(2, "0");
    });
  };

  // Generate minutes 00-59
  const generateMinutes = () => {
    return Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  };

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
                "w-full justify-start text-left font-normal h-10 px-3 pr-20",
                !selectedDate && "text-muted-foreground",
                errorMessage && "border-red-500",
                inputClassName
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayValue || inputPlaceholder}
            </Button>

            {selectedDate && !disabled && (
              <div
                className="absolute right-11 top-1/2 transform -translate-y-1/2 cursor-pointer z-10"
                onClick={handleClear}
                title="Clear date and time"
              >
                <X size={16} strokeWidth={3} />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            {/* Calendar */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={disabledDays.length > 0 ? disabledDays : undefined}
              initialFocus
              captionLayout="dropdown"
              fromYear={fromYear}
              toYear={toYear}
            />

            {/* Time Selection */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Time</span>
              </div>
              <div className="flex gap-2 items-center">
                {/* Hours */}
                <select
                  value={hours}
                  onChange={(e) => {
                    const newHours = e.target.value;
                    setHours(newHours);
                    handleTimeChange(newHours, minutes, period);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {generateHours().map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                <span className="text-gray-500">:</span>

                {/* Minutes */}
                <select
                  value={minutes}
                  onChange={(e) => {
                    const newMinutes = e.target.value;
                    setMinutes(newMinutes);
                    handleTimeChange(hours, newMinutes, period);
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {generateMinutes().map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* AM/PM */}
                <select
                  value={period}
                  onChange={(e) => {
                    const newPeriod = e.target.value as "AM" | "PM";
                    setPeriod(newPeriod);
                    handleTimeChange(hours, minutes, newPeriod);
                  }}
                  className="w-20 border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Done Button */}
            <div className="border-t border-gray-200 p-3">
              <Button
                type="button"
                onClick={handleDone}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
