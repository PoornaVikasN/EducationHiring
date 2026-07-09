'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { adminApi } from '../lib/api/admin';
import { Role } from '../lib/shared/enums';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

const schema = z.object({
  role: z.enum([Role.TEACHER, Role.RECRUITER, Role.ADMIN]),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email address'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
    .transform((v) => `+91${v}`),
  password: z.string().min(10, 'Password must be at least 10 characters').max(64),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminCreateUserDialog({ open, onOpenChange, onSuccess }: Props) {
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { role: Role.TEACHER },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    try {
      await adminApi.createUser({
        role: data.role,
        email: data.email,
        phone: data.phone,
        fullName: data.fullName || undefined,
        password: data.password,
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create user. Please try again.';
      setServerError(typeof msg === 'string' ? msg : 'Failed to create user.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setServerError(''); } onOpenChange(v); }}>
      <DialogContent className="max-w-md bg-bg-card border border-border-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-text-primary">
            <UserPlus className="w-4 h-4 text-brand-primary" /> Create User
          </DialogTitle>
        </DialogHeader>

        {/* Role toggle */}
        <div className="flex gap-2">
          {([
            { value: Role.TEACHER, label: 'Teacher' },
            { value: Role.RECRUITER, label: 'School' },
            { value: Role.ADMIN, label: '🔑 Admin' },
          ] as { value: Role; label: string }[]).map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={selectedRole === value ? 'default' : 'outline'}
              className={`flex-1 ${value === Role.ADMIN && selectedRole === Role.ADMIN ? 'bg-purple-600 hover:bg-purple-700 border-purple-600' : ''}`}
              onClick={() => setValue('role', value as FormValues['role'])}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Admin warning */}
        {selectedRole === Role.ADMIN && (
          <div className="rounded-xl bg-purple-50 border border-purple-200 px-3 py-2.5 text-xs text-purple-700 leading-relaxed">
            ⚠️ This creates an account with <strong>full admin access</strong> — pricing, API keys, users, schools, and jobs. Share credentials securely and use with caution.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Full name — hidden for Admin role */}
          {selectedRole !== Role.ADMIN && (
            <div className="space-y-1">
              <Label htmlFor="cu-fullName">Full name</Label>
              <Input id="cu-fullName" placeholder="Dr. Priya Sharma" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" placeholder="user@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cu-phone">Phone</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border-default bg-bg-page text-sm text-text-muted select-none">
                +91
              </span>
              <Input
                id="cu-phone"
                type="tel"
                placeholder="98765 43210"
                className="rounded-l-none flex-1"
                maxLength={10}
                {...register('phone')}
              />
            </div>
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cu-password">Temporary password</Label>
            <div className="relative">
              <Input
                id="cu-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 10 characters"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <p className="text-xs text-text-muted">
            Account will be created with email verified. Share the temporary password with the user.
          </p>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); setServerError(''); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
