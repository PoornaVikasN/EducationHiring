'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { adminApi, type PricingConfig, type AuditLog } from '../../../lib/api/admin';
import { Button } from '../../../common-components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { Textarea } from '../../../common-components/ui/textarea';
import { useToast } from '../../../hooks/use-toast';

function PriceCard({ config, onSave, lastAudit, disabled, disabledNote }: { config: PricingConfig; onSave: (key: string, rupees: number) => Promise<void>; lastAudit?: AuditLog; disabled?: boolean; disabledNote?: string }) {
  const currentRupees = config.valueNumber / 100;
  const [value, setValue] = useState(String(currentRupees));
  const [saving, setSaving] = useState(false);
  const minRupees = config.minValue / 100;
  const isDirty = Number(value) !== currentRupees;

  const handleSave = async () => {
    const rupees = Number(value);
    if (!Number.isInteger(rupees * 100) || rupees < minRupees) return;
    setSaving(true);
    try {
      await onSave(config.key, rupees);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-bg-card border rounded-2xl p-5 flex flex-col gap-4 ${disabled ? 'border-slate-200 opacity-70' : 'border-border-default'}`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-text-primary">{config.label}</h3>
          {disabled && (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">OFF</span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">{config.description}</p>
        {disabled && disabledNote && (
          <p className="text-[11px] text-amber-600 mt-1.5">⚠ {disabledNote}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">₹</span>
          <Input
            type="number"
            className="pl-7"
            value={value}
            min={minRupees}
            step={1}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={!isDirty || saving || Number(value) < minRupees}
          onClick={handleSave}
          className="gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-muted">Min: ₹{minRupees}</p>
        {lastAudit && (
          <p className="text-[11px] text-text-muted">
            Updated {new Date(lastAudit.createdAt).toLocaleDateString('en-IN')} by {lastAudit.adminEmail.split('@')[0]}
          </p>
        )}
      </div>
    </div>
  );
}

const addPriceSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Must be UPPER_SNAKE_CASE (e.g. APPLICATION_FEE_PAISE)'),
  label: z.string().min(2, 'Label is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  minRupees: z.coerce.number().min(0),
  valueRupees: z.coerce.number().min(0),
});
type AddPriceFormValues = z.infer<typeof addPriceSchema>;

function AddPriceDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddPriceFormValues>({
    resolver: zodResolver(addPriceSchema) as Resolver<AddPriceFormValues>,
    defaultValues: { minRupees: 1, valueRupees: 1 },
  });

  const onSubmit = async (data: AddPriceFormValues) => {
    setServerError('');
    try {
      await adminApi.createPrice({
        key: data.key,
        label: data.label,
        description: data.description || '',
        minValue: Math.round(data.minRupees * 100),
        valueNumber: Math.round(data.valueRupees * 100),
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create price. Please try again.';
      setServerError(typeof msg === 'string' ? msg : 'Failed to create price.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setServerError(''); } onOpenChange(v); }}>
      <DialogContent className="max-w-md bg-bg-card border border-border-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-text-primary">
            <Plus className="w-4 h-4 text-brand-primary" /> Add Price
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ap-key">Key (UPPER_SNAKE_CASE, used in code)</Label>
            <Input id="ap-key" placeholder="e.g. APPLICATION_FEE_PAISE" {...register('key')} />
            {errors.key && <p className="text-xs text-red-500">{errors.key.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ap-label">Label (shown to admins)</Label>
            <Input id="ap-label" placeholder="e.g. Teacher Shortlist Fee" {...register('label')} />
            {errors.label && <p className="text-xs text-red-500">{errors.label.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ap-description">Description</Label>
            <Textarea id="ap-description" rows={2} placeholder="What this price is for and when it applies" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ap-min">Minimum (₹)</Label>
              <Input id="ap-min" type="number" min={0} step={1} {...register('minRupees')} />
              {errors.minRupees && <p className="text-xs text-red-500">{errors.minRupees.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ap-value">Initial amount (₹)</Label>
              <Input id="ap-value" type="number" min={0} step={1} {...register('valueRupees')} />
              {errors.valueRupees && <p className="text-xs text-red-500">{errors.valueRupees.message}</p>}
            </div>
          </div>

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
              {isSubmitting ? 'Creating…' : 'Create price'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPricingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pricing'],
    queryFn: () => adminApi.getPricing().then((r) => r.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin-audit', 1, 'price'],
    queryFn: () => adminApi.listAuditLogs(1, 50, 'price').then((r) => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  const teacherPaidEnabled = (settings ?? []).find((s) => s.key === 'TEACHER_PAID_ENABLED')?.valueNumber !== 0;
  const schoolPaidEnabled  = (settings ?? []).find((s) => s.key === 'SCHOOL_PAID_ENABLED')?.valueNumber  !== 0;

  // Map: price key → most recent audit entry
  const auditByKey = new Map<string, AuditLog>();
  (auditData?.data ?? []).forEach((log) => {
    if (log.entityId && !auditByKey.has(log.entityId)) {
      auditByKey.set(log.entityId, log);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, valueNumber }: { key: string; valueNumber: number }) =>
      adminApi.updatePrice(key, valueNumber),
    onSuccess: () => {
      toast({ title: 'Price updated' });
      qc.invalidateQueries({ queryKey: ['admin-pricing'] });
    },
    onError: () => toast({ title: 'Failed to update price', variant: 'destructive' }),
  });

  const handleSave = async (key: string, rupees: number) => {
    await updateMutation.mutateAsync({ key, valueNumber: Math.round(rupees * 100) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Pricing Management
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Manage platform pricing. Changes apply immediately to all new orders.</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Price
        </Button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
        <span className="font-semibold">Changes take effect immediately.</span> Any order already in progress (payment initiated but not completed) will honour the price that was set when it started — not the new price.
        Cards marked <span className="font-semibold">OFF</span> have their feature disabled in Platform Settings and won&apos;t charge users even if a price is set.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      ) : !data?.length ? (
        <div className="p-10 text-center bg-bg-card border border-border-default rounded-2xl">
          <DollarSign className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">No prices configured yet. Click &quot;Add Price&quot; to create the first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((config) => {
            const isAppFee = config.key === 'APPLICATION_FEE_PAISE';
            const isSubFee = config.key === 'RECRUITER_MONTHLY_PAISE';
            const cardDisabled = (isAppFee && !teacherPaidEnabled) || (isSubFee && !schoolPaidEnabled);
            const note = isAppFee && !teacherPaidEnabled
              ? 'Teacher payments are currently OFF. Enable via Config → Platform Settings → Teacher Paid.'
              : isSubFee && !schoolPaidEnabled
              ? 'School subscription is currently OFF. Enable via Config → Platform Settings → School Paid.'
              : undefined;
            return (
              <PriceCard
                key={config.key}
                config={config}
                onSave={handleSave}
                lastAudit={auditByKey.get(config.key)}
                disabled={cardDisabled}
                disabledNote={note}
              />
            );
          })}
        </div>
      )}

      <AddPriceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          toast({ title: 'Price created' });
          qc.invalidateQueries({ queryKey: ['admin-pricing'] });
        }}
      />
    </div>
  );
}
