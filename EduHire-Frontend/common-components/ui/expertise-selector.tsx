'use client';

import * as React from 'react';
import { Check, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ExpertiseSelectorProps {
  value: string[];
  onValueChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  allowCustom?: boolean;
  /** Optional display formatter — options/value stay raw strings, only the rendered label changes (e.g. enum values -> title case). */
  formatLabel?: (option: string) => string;
}

export function ExpertiseSelector({
  value,
  onValueChange,
  options,
  placeholder = 'Select specialties',
  searchPlaceholder = 'Search...',
  className,
  allowCustom = false,
  formatLabel,
}: ExpertiseSelectorProps) {
  const label = formatLabel ?? ((o: string) => o);
  const [search, setSearch] = React.useState('');

  const addCustom = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !value.includes(trimmed)) {
      onValueChange([...value, trimmed]);
    }
    setSearch('');
  };

  const toggle = (option: string) => {
    if (value.includes(option)) {
      onValueChange(value.filter((v) => v !== option));
    } else {
      onValueChange([...value, option]);
    }
  };

  const selected = options.filter((o) => value.includes(o));
  const unselected = options
    .filter((o) => !value.includes(o))
    .filter((o) => !search || label(o).toLowerCase().includes(search.toLowerCase()))
    .slice(0, 20);

  const visible = [...selected, ...unselected];

  // Items custom-added that aren't in options
  const customSelected = value.filter((v) => !options.includes(v));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (allowCustom && e.key === 'Enter') {
            e.preventDefault();
            addCustom(search);
          }
        }}
        placeholder={searchPlaceholder}
        className="h-8 text-sm"
      />
      {allowCustom && search.trim() && !options.includes(search.trim()) && (
        <button
          type="button"
          onClick={() => addCustom(search)}
          className="self-start text-xs text-primary underline px-1"
        >
          + Add &quot;{search.trim()}&quot;
        </button>
      )}
      {visible.length === 0 && customSelected.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">
          {placeholder}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {customSelected.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onValueChange(value.filter((v) => v !== option))}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors bg-primary text-primary-foreground border-primary"
          >
            <Check className="size-3" />
            {option}
          </button>
        ))}
        {visible.map((option) => {
          const active = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
              )}
            >
              {active ? <Check className="size-3" /> : <Plus className="size-3" />}
              {label(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
