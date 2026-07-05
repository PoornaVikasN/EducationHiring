'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  registration: UseFormRegisterReturn;
  error?: string;
  rightSlot?: ReactNode;
}

export function PasswordField({ id, label, placeholder, autoComplete, registration, error, rightSlot }: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {rightSlot}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="pr-10"
          {...registration}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
