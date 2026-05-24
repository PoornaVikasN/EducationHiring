'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, Pencil, Save, Settings, SlidersHorizontal, XCircle } from 'lucide-react';
import { useState } from 'react';
import { adminApi, type ApiKeyStatus, type SettingConfig } from '../../../lib/api/admin';
import { Button } from '../../../common-components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { Input } from '../../../common-components/ui/input';
import { Switch } from '../../../common-components/ui/switch';
import { useToast } from '../../../hooks/use-toast';

function groupByService(statuses: ApiKeyStatus[]) {
  const groups: Record<string, ApiKeyStatus[]> = {};
  for (const s of statuses) {
    if (!groups[s.service]) groups[s.service] = [];
    groups[s.service].push(s);
  }
  return groups;
}

function ApiKeyRow({ status, onEdit }: { status: ApiKeyStatus; onEdit: (s: ApiKeyStatus) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border-default last:border-0">
      <div>
        <p className="text-sm font-medium text-text-primary">{status.label}</p>
        <p className="text-xs font-mono text-text-muted">{status.key}</p>
      </div>
      <div className="flex items-center gap-3">
        {status.isSet ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Configured
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
            <XCircle className="w-3.5 h-3.5" /> Not set
          </span>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(status)}>
          <Pencil className="w-3 h-3" /> Edit
        </Button>
      </div>
    </div>
  );
}

function SettingCard({ config, onSave }: { config: SettingConfig; onSave: (key: string, value: number) => Promise<void> }) {
  const isBoolean = config.key.endsWith('_ENABLED');
  const [numValue, setNumValue] = useState(String(config.valueNumber));
  const [toggled, setToggled] = useState(config.valueNumber !== 0);
  const [saving, setSaving] = useState(false);

  const isDirtyNum = !isBoolean && Number(numValue) !== config.valueNumber;
  const numVal = Number(numValue);
  const isValidNum = !isNaN(numVal) && numVal >= config.minValue;

  const handleSaveNum = async () => {
    if (!isDirtyNum || !isValidNum) return;
    setSaving(true);
    try { await onSave(config.key, numVal); } finally { setSaving(false); }
  };

  const handleToggle = async (checked: boolean) => {
    setToggled(checked);
    setSaving(true);
    try { await onSave(config.key, checked ? 1 : 0); } finally { setSaving(false); }
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-text-primary">{config.label}</h3>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">{config.description}</p>
      </div>

      {isBoolean ? (
        <div className="flex items-center justify-between rounded-xl border border-border-default px-4 py-3 bg-bg-page">
          <div>
            <p className={`text-sm font-semibold ${toggled ? 'text-green-700' : 'text-red-500'}`}>
              {toggled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {toggled ? 'Active — users will be charged' : 'Inactive — no charges applied'}
            </p>
          </div>
          <Switch checked={toggled} onCheckedChange={handleToggle} disabled={saving} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="max-w-[140px]"
              value={numValue}
              min={config.minValue}
              step={1}
              onChange={(e) => setNumValue(e.target.value)}
            />
            <Button size="sm" disabled={!isDirtyNum || !isValidNum || saving} onClick={handleSaveNum} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <p className="text-[11px] text-text-muted">
            Min: {config.minValue} · Currently: <span className="font-semibold text-text-primary">{config.valueNumber}</span>
          </p>
        </>
      )}
    </div>
  );
}

export default function AdminConfigPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<ApiKeyStatus | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showValue, setShowValue] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-api-key-statuses'],
    queryFn: () => adminApi.getApiKeyStatuses().then((r) => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.setApiKey(key, value),
    onSuccess: () => {
      toast({ title: 'Key saved. Active on next API call.' });
      qc.invalidateQueries({ queryKey: ['admin-api-key-statuses'] });
      setEditTarget(null);
      setEditValue('');
      setShowValue(false);
    },
    onError: () => toast({ title: 'Failed to save key', variant: 'destructive' }),
  });

  const saveSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) =>
      adminApi.updateSetting(key, value),
    onSuccess: () => {
      toast({ title: 'Setting saved.' });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: () => toast({ title: 'Failed to save setting', variant: 'destructive' }),
  });

  const groups = data ? groupByService(data) : {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Settings className="w-5 h-5" /> Configuration
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Manage API keys, service credentials, and platform settings.</p>
      </div>

      {/* ── Job Alert Settings ─────────────────────────────────────────────── */}
      {settings && settings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">Platform Settings</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {settings.map((s) => (
              <SettingCard
                key={s.key}
                config={s}
                onSave={async (key, value) => {
                  await saveSettingMutation.mutateAsync({ key, value });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── API Keys ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">API Keys &amp; Credentials</h2>
          </div>
          {Object.entries(groups).map(([service, keys]) => (
            <div key={service} className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-bg-page border-b border-border-default">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">{service}</h2>
              </div>
              <div className="px-5">
                {keys.map((k) => (
                  <ApiKeyRow key={k.key} status={k} onEdit={(s) => { setEditTarget(s); setEditValue(''); setShowValue(false); }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditValue(''); setShowValue(false); } }}>
        <DialogContent className="max-w-sm bg-bg-card border border-border-default">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-text-primary">{editTarget?.label}</DialogTitle>
            <p className="text-xs font-mono text-text-muted">{editTarget?.key}</p>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Input
                type={showValue ? 'text' : 'password'}
                placeholder="Enter new value…"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                onClick={() => setShowValue((p) => !p)}
              >
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              className="w-full"
              disabled={editValue.length < 4 || saveMutation.isPending}
              onClick={() => editTarget && saveMutation.mutate({ key: editTarget.key, value: editValue })}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Key'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
