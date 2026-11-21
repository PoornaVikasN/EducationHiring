'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Same bounds the Teacher profile / job-posting forms enforce for "years of experience". */
export const EXPERIENCE_MIN_YEARS = 0;
export const EXPERIENCE_MAX_YEARS = 50;

/** Blank / non-numeric input means "no bound" (undefined), never 0. */
export function parseYears(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** True when both bounds are set and From is greater than To — callers use it to block Apply. */
export function isExperienceRangeInvalid(from: string, to: string): boolean {
  const f = parseYears(from);
  const t = parseYears(to);
  return f !== undefined && t !== undefined && f > t;
}

interface ExperienceRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
}

/**
 * "From – To years" number inputs used by the teacher/job filter dialogs (Admin Users, Admin Jobs,
 * School Applicants). Values stay strings so an empty field is distinguishable from 0.
 */
export function ExperienceRangeFilter({ from, to, onChange, label = 'Experience (years)' }: ExperienceRangeFilterProps) {
  const invalid = isExperienceRangeInvalid(from, to);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={EXPERIENCE_MIN_YEARS}
          max={EXPERIENCE_MAX_YEARS}
          placeholder="From"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
          aria-invalid={invalid}
          className="h-9 text-sm"
        />
        <span className="text-xs text-text-muted shrink-0">to</span>
        <Input
          type="number"
          inputMode="numeric"
          min={EXPERIENCE_MIN_YEARS}
          max={EXPERIENCE_MAX_YEARS}
          placeholder="To"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
          aria-invalid={invalid}
          className="h-9 text-sm"
        />
      </div>
      {invalid && <p className="text-xs text-red-600">&ldquo;From&rdquo; can&apos;t be greater than &ldquo;To&rdquo;.</p>}
    </div>
  );
}
