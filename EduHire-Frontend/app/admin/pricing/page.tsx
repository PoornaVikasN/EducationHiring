'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Save } from 'lucide-react';
import { useState } from 'react';
import { adminApi, type PricingConfig, type AuditLog } from '../../../lib/api/admin';
import { Button } from '../../../common-components/ui/button';
import { Input } from '../../../common-components/ui/input';
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

export default function AdminPricingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

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
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Pricing Management
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Manage platform pricing. Changes apply immediately to all new orders.</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
        <span className="font-semibold">Changes take effect immediately.</span> Any order already in progress (payment initiated but not completed) will honour the price that was set when it started — not the new price.
        Cards marked <span className="font-semibold">OFF</span> have their feature disabled in Platform Settings and won&apos;t charge users even if a price is set.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map((config) => {
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
    </div>
  );
}
