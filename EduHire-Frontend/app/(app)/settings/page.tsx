'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Bell, Eye, EyeOff, KeyRound, Loader2, AlertTriangle, Send } from 'lucide-react';
import { Button } from '../../../common-components/ui/button';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common-components/ui/select';
import { Switch } from '../../../common-components/ui/switch';
import { Textarea } from '../../../common-components/ui/textarea';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../lib/auth-context';
import { usersApi } from '../../../lib/api/users';
import { disputesApi } from '../../../lib/api/disputes';
import { Role } from '../../../lib/shared/enums';
import type { DisputeKind } from '../../../lib/api/admin';

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type PwForm = z.infer<typeof pwSchema>;

const disputeSchema = z.object({
  kind: z.enum(['PAYMENT_REFUND', 'APPLICATION_DISPUTE', 'OTHER'] as const),
  subject: z.string().min(5, 'Min 5 characters').max(200),
  description: z.string().min(10, 'Min 10 characters').max(2000),
  referenceId: z.string().optional(),
});
type DisputeForm = z.infer<typeof disputeSchema>;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [activeTab, setActiveTab] = useState<'password' | 'alerts' | 'disputes' | 'danger'>('password');
  const [alertFt, setAlertFt] = useState(user?.alertNewJobs ?? true);
  const isSeeker = user?.role === Role.TEACHER;

  const pwForm = useForm<PwForm>({ resolver: zodResolver(pwSchema) });
  const disputeForm = useForm<DisputeForm>({ resolver: zodResolver(disputeSchema) });

  const changePwMutation = useMutation({
    mutationFn: (data: PwForm) =>
      usersApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
      pwForm.reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: (data: DisputeForm) => disputesApi.create(data as { kind: DisputeKind; subject: string; description: string; referenceId?: string }),
    onSuccess: () => {
      toast({ title: 'Dispute submitted', description: 'Our team will review within 1 business day.' });
      disputeForm.reset();
    },
    onError: () => toast({ title: 'Failed', description: 'Could not submit dispute.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deactivate(),
    onSuccess: async () => {
      toast({ title: 'Account deleted', description: 'Your account has been deactivated.' });
      await logout().catch(() => {});
      router.push('/');
    },
    onError: () => toast({ title: 'Failed', description: 'Could not delete account.', variant: 'destructive' }),
  });

  const alertsMutation = useMutation({
    mutationFn: (data: { alertNewJobs?: boolean }) =>
      usersApi.updateSettings(data),
    onSuccess: () => toast({ title: 'Alert preferences saved' }),
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
  });

  const tabs = [
    { id: 'password', label: 'Change Password' },
    ...(isSeeker ? [{ id: 'alerts', label: 'Job Alerts' }] : []),
    { id: 'disputes', label: 'Raise Dispute' },
    { id: 'danger', label: 'Danger Zone' },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Account Settings</h1>
        <p className="text-text-muted text-sm mt-1">Manage your password, disputes, and account.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-page rounded-xl p-1 border border-border-default">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as 'password' | 'alerts' | 'disputes' | 'danger')}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
              activeTab === t.id ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Change Password */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl border border-border-default p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-brand-secondary" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary">Change Password</h2>
              <p className="text-xs text-text-muted">Use a strong, unique password.</p>
            </div>
          </div>
          <form onSubmit={pwForm.handleSubmit((d) => changePwMutation.mutate(d))} className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  {...pwForm.register('currentPassword')}
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" onClick={() => setShowCurrent((v) => !v)}>
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-500 mt-1">{pwForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <Label>New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showNew ? 'text' : 'password'}
                  {...pwForm.register('newPassword')}
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" onClick={() => setShowNew((v) => !v)}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.formState.errors.newPassword && (
                <p className="text-xs text-red-500 mt-1">{pwForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" {...pwForm.register('confirmPassword')} className="mt-1" />
              {pwForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{pwForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={changePwMutation.isPending}>
              {changePwMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </form>
        </div>
      )}

      {/* Job Alerts */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-border-default p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary">Job Alert Preferences</h2>
              <p className="text-xs text-text-muted">Choose which job types you&apos;d like to be notified about in your preferred cities.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border-default px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Job Alerts</p>
              <p className="text-xs text-text-muted">Get notified when new jobs are posted in your city</p>
            </div>
            <Switch
              checked={alertFt}
              onCheckedChange={(v) => {
                setAlertFt(v);
                alertsMutation.mutate({ alertNewJobs: v });
              }}
            />
          </div>

          <p className="text-xs text-text-muted">
            Set your preferred cities in your <a href="/profile" className="text-brand-primary underline">profile</a> to receive city-based job alerts.
          </p>
        </div>
      )}

      {/* Raise Dispute */}
      {activeTab === 'disputes' && (
        <div className="bg-white rounded-2xl border border-border-default p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Send className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary">Raise a Dispute</h2>
              <p className="text-xs text-text-muted">Payment issues or application concerns. We respond in 1 business day.</p>
            </div>
          </div>
          <form onSubmit={disputeForm.handleSubmit((d) => disputeMutation.mutate(d))} className="space-y-4">
            <div>
              <Label>Dispute Type</Label>
              <Select onValueChange={(v) => disputeForm.setValue('kind', v as DisputeKind)} defaultValue="">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYMENT_REFUND">Payment Refund</SelectItem>
                  <SelectItem value="APPLICATION_DISPUTE">Application Dispute</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {disputeForm.formState.errors.kind && (
                <p className="text-xs text-red-500 mt-1">{disputeForm.formState.errors.kind.message}</p>
              )}
            </div>
            <div>
              <Label>Subject</Label>
              <Input {...disputeForm.register('subject')} className="mt-1" placeholder="Brief summary of your issue" />
              {disputeForm.formState.errors.subject && (
                <p className="text-xs text-red-500 mt-1">{disputeForm.formState.errors.subject.message}</p>
              )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                {...disputeForm.register('description')}
                className="mt-1"
                rows={4}
                placeholder="Describe your issue in detail..."
              />
              {disputeForm.formState.errors.description && (
                <p className="text-xs text-red-500 mt-1">{disputeForm.formState.errors.description.message}</p>
              )}
            </div>
            <div>
              <Label>Reference ID (optional)</Label>
              <Input {...disputeForm.register('referenceId')} className="mt-1" placeholder="Payment ID or Application ID if applicable" />
            </div>
            <Button type="submit" disabled={disputeMutation.isPending}>
              {disputeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Dispute
            </Button>
          </form>
        </div>
      )}

      {/* Danger Zone */}
      {activeTab === 'danger' && (
        <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-red-600">Danger Zone</h2>
              <p className="text-xs text-text-muted">These actions are irreversible.</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
            <p className="text-sm font-medium text-red-700 mb-1">Delete Account</p>
            <p className="text-xs text-red-600">
              Deletes your account permanently. All active applications, jobs, and data will be lost. You cannot undo this.
            </p>
          </div>
          <div className="space-y-3">
            <Label className="text-sm">Type <span className="font-mono bg-red-50 px-1 rounded">DELETE</span> to confirm</Label>
            <Input
              className="border-red-200 focus-visible:ring-red-400"
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <Button
              variant="destructive"
              disabled={deleteConfirm !== 'DELETE' || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Permanently Delete Account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
