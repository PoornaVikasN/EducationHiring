'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, FileText, Mail, Pencil, Save, Settings, SlidersHorizontal, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { adminApi, type ApiKeyStatus, type EmailTemplate, type EmailTemplateChannels, type LegalPage, type LegalSection, type SettingConfig } from '../../../lib/api/admin';
import { Button } from '../../../common-components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { Input } from '../../../common-components/ui/input';
import { Switch } from '../../../common-components/ui/switch';
import { Textarea } from '../../../common-components/ui/textarea';
import { useToast } from '../../../hooks/use-toast';

const TRANSACTIONAL_KEYS = new Set(['REGISTRATION_OTP', 'ONBOARDING', 'GENERIC_OTP', 'PASSWORD_RESET_OTP']);

const DEFAULT_CHANNELS: EmailTemplateChannels = { seekerEmail: true, seekerInApp: false, recruiterEmail: false, recruiterInApp: false };

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

  // Email Templates state
  const [editTpl, setEditTpl] = useState<EmailTemplate | null>(null);
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplActive, setTplActive] = useState(true);
  const [tplChannels, setTplChannels] = useState<EmailTemplateChannels>(DEFAULT_CHANNELS);
  const [tplInAppSeekerTitle, setTplInAppSeekerTitle] = useState('');
  const [tplInAppSeekerBody, setTplInAppSeekerBody] = useState('');
  const [tplInAppRecruiterTitle, setTplInAppRecruiterTitle] = useState('');
  const [tplInAppRecruiterBody, setTplInAppRecruiterBody] = useState('');

  // Legal Pages state
  const [editLegal, setEditLegal] = useState<LegalPage | null>(null);
  const [legalTitle, setLegalTitle] = useState('');
  const [legalUpdatedLabel, setLegalUpdatedLabel] = useState('');
  const [legalSections, setLegalSections] = useState<LegalSection[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-api-key-statuses'],
    queryFn: () => adminApi.getApiKeyStatuses().then((r) => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  const { data: templates, isLoading: tplLoading } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: () => adminApi.getEmailTemplates().then((r) => r.data),
  });

  const { data: legalPages, isLoading: legalLoading } = useQuery({
    queryKey: ['admin-legal-pages'],
    queryFn: () => adminApi.getLegalPages().then((r) => r.data),
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

  const updateTplMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Parameters<typeof adminApi.updateEmailTemplate>[1] }) =>
      adminApi.updateEmailTemplate(key, data),
    onSuccess: () => {
      toast({ title: 'Template saved.' });
      qc.invalidateQueries({ queryKey: ['admin-email-templates'] });
      setEditTpl(null);
    },
    onError: () => toast({ title: 'Failed to save template', variant: 'destructive' }),
  });

  const deleteTplMutation = useMutation({
    mutationFn: (key: string) => adminApi.deleteEmailTemplate(key),
    onSuccess: () => {
      toast({ title: 'Template deleted.' });
      qc.invalidateQueries({ queryKey: ['admin-email-templates'] });
    },
    onError: () => toast({ title: 'Failed to delete template', variant: 'destructive' }),
  });

  const updateLegalMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Parameters<typeof adminApi.updateLegalPage>[1] }) =>
      adminApi.updateLegalPage(key, data),
    onSuccess: () => {
      toast({ title: 'Legal page saved.' });
      qc.invalidateQueries({ queryKey: ['admin-legal-pages'] });
      setEditLegal(null);
    },
    onError: () => toast({ title: 'Failed to save legal page', variant: 'destructive' }),
  });

  const openEditLegal = (page: LegalPage) => {
    setEditLegal(page);
    setLegalTitle(page.title);
    setLegalUpdatedLabel(page.lastUpdatedLabel);
    setLegalSections(page.sections.map((s) => ({ ...s })));
  };

  const openEditTpl = (tpl: EmailTemplate) => {
    setEditTpl(tpl);
    setTplSubject(tpl.subject);
    setTplBody(tpl.body);
    setTplDesc(tpl.description);
    setTplActive(tpl.isActive);
    setTplChannels(tpl.channels ?? DEFAULT_CHANNELS);
    setTplInAppSeekerTitle(tpl.inAppSeekerTitle ?? '');
    setTplInAppSeekerBody(tpl.inAppSeekerBody ?? '');
    setTplInAppRecruiterTitle(tpl.inAppRecruiterTitle ?? '');
    setTplInAppRecruiterBody(tpl.inAppRecruiterBody ?? '');
  };

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

      {/* ── Email Templates ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-primary" />
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">Email Templates</h2>
        </div>
        {tplLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(templates ?? []).map((tpl) => (
              <div key={tpl.key} className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-text-primary">{tpl.name}</h3>
                      {tpl.isSystem && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">System</span>
                      )}
                      {tpl.isActive ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Inactive</span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-brand-primary mt-0.5">Trigger: {tpl.trigger}</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{tpl.description}</p>
                    {tpl.channels && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tpl.channels.seekerEmail    && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50  text-blue-700  border border-blue-100">✉ Teacher</span>}
                        {tpl.channels.seekerInApp    && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">🔔 Teacher</span>}
                        {tpl.channels.recruiterEmail && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50  text-blue-700  border border-blue-100">✉ Recruiter</span>}
                        {tpl.channels.recruiterInApp && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">🔔 Recruiter</span>}
                      </div>
                    )}
                    {tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tpl.variables.map((v) => (
                          <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-page border border-border-default text-text-muted">{`{{${v}}}`}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditTpl(tpl)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    {!tpl.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        disabled={deleteTplMutation.isPending}
                        onClick={() => deleteTplMutation.mutate(tpl.key)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Legal Pages ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-primary" />
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">Legal Pages</h2>
        </div>
        {legalLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(legalPages ?? []).map((page) => (
              <div key={page.key} className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary">{page.title}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{page.lastUpdatedLabel}</p>
                    <p className="text-[11px] text-text-muted mt-1">{page.sections.length} sections · /{page.key}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => openEditLegal(page)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* Email Template edit dialog */}
      <Dialog open={!!editTpl} onOpenChange={(open) => { if (!open) setEditTpl(null); }}>
        <DialogContent className="!w-[45vw] !max-w-[45vw] bg-bg-card border border-border-default max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-text-primary">Edit: {editTpl?.name}</DialogTitle>
            <p className="text-xs font-mono text-text-muted">{editTpl?.key}</p>
          </DialogHeader>
          <div className="space-y-4 mt-2 min-w-0">

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-primary">Active</p>
                <p className="text-xs text-text-muted">Inactive templates fall back to hardcoded defaults</p>
              </div>
              <Switch checked={tplActive} onCheckedChange={setTplActive} />
            </div>

            {/* Delivery channels */}
            <div className="rounded-xl border border-border-default p-3 space-y-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Delivery Channels</p>
              {editTpl && TRANSACTIONAL_KEYS.has(editTpl.key) ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Email (global on/off)</p>
                    <p className="text-xs text-text-muted">Auth / transactional email — always to the acting user</p>
                  </div>
                  <Switch
                    checked={tplChannels.seekerEmail}
                    onCheckedChange={(v) => setTplChannels((c) => ({ ...c, seekerEmail: v }))}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {([
                    { field: 'seekerEmail'    as const, label: 'Teacher Email',    icon: '✉' },
                    { field: 'seekerInApp'    as const, label: 'Teacher In-App',   icon: '🔔' },
                    { field: 'recruiterEmail' as const, label: 'Recruiter Email',  icon: '✉' },
                    { field: 'recruiterInApp' as const, label: 'Recruiter In-App', icon: '🔔' },
                  ] as const).map(({ field, label, icon }) => (
                    <div key={field} className="flex items-center justify-between">
                      <p className="text-xs text-text-primary">{icon} {label}</p>
                      <Switch
                        checked={tplChannels[field]}
                        onCheckedChange={(v) => setTplChannels((c) => ({ ...c, [field]: v }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* In-app content — Teacher */}
            {tplChannels.seekerInApp && editTpl && !TRANSACTIONAL_KEYS.has(editTpl.key) && (
              <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">🔔 Teacher In-App Content</p>
                <p className="text-[11px] text-text-muted">Leave blank to use the default hardcoded message.</p>
                {editTpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editTpl.variables.map((v) => (
                      <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-page border border-border-default text-text-muted select-all">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Title</label>
                  <Input value={tplInAppSeekerTitle} onChange={(e) => setTplInAppSeekerTitle(e.target.value)} placeholder="Leave blank to use default" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Body</label>
                  <Textarea rows={2} value={tplInAppSeekerBody} onChange={(e) => setTplInAppSeekerBody(e.target.value)} placeholder="Leave blank to use default" />
                </div>
              </div>
            )}

            {/* In-app content — Recruiter */}
            {tplChannels.recruiterInApp && editTpl && !TRANSACTIONAL_KEYS.has(editTpl.key) && (
              <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">🔔 Recruiter In-App Content</p>
                <p className="text-[11px] text-text-muted">Leave blank to use the default hardcoded message.</p>
                {editTpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editTpl.variables.map((v) => (
                      <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-page border border-border-default text-text-muted select-all">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Title</label>
                  <Input value={tplInAppRecruiterTitle} onChange={(e) => setTplInAppRecruiterTitle(e.target.value)} placeholder="Leave blank to use default" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Body</label>
                  <Textarea rows={2} value={tplInAppRecruiterBody} onChange={(e) => setTplInAppRecruiterBody(e.target.value)} placeholder="Leave blank to use default" />
                </div>
              </div>
            )}

            {/* Description / subject / body */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Description</label>
              <Input value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} placeholder="Template description…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Subject</label>
              <Input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} placeholder="Email subject…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Body (HTML)</label>
              {editTpl && editTpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {editTpl.variables.map((v) => (
                    <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-page border border-border-default text-text-muted cursor-pointer select-all">{`{{${v}}}`}</span>
                  ))}
                </div>
              )}
              <div className="w-full overflow-x-auto rounded-md border border-border-default">
                <Textarea
                  rows={24}
                  value={tplBody}
                  onChange={(e) => setTplBody(e.target.value)}
                  placeholder="HTML body…"
                  className="font-mono text-xs whitespace-pre min-w-[700px] resize-y overflow-y-auto border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditTpl(null)}>Cancel</Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={updateTplMutation.isPending}
                onClick={() => editTpl && updateTplMutation.mutate({
                  key: editTpl.key,
                  data: {
                    subject: tplSubject,
                    body: tplBody,
                    description: tplDesc,
                    isActive: tplActive,
                    channels: tplChannels,
                    inAppSeekerTitle:    tplInAppSeekerTitle    || null,
                    inAppSeekerBody:     tplInAppSeekerBody     || null,
                    inAppRecruiterTitle: tplInAppRecruiterTitle || null,
                    inAppRecruiterBody:  tplInAppRecruiterBody  || null,
                  },
                })}
              >
                <Save className="w-3.5 h-3.5" />
                {updateTplMutation.isPending ? 'Saving…' : 'Save Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Legal Page edit dialog */}
      <Dialog open={!!editLegal} onOpenChange={(open) => { if (!open) setEditLegal(null); }}>
        <DialogContent className="max-w-2xl bg-bg-card border border-border-default max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLegal?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Title</label>
                <Input value={legalTitle} onChange={(e) => setLegalTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Last updated label</label>
                <Input value={legalUpdatedLabel} onChange={(e) => setLegalUpdatedLabel(e.target.value)} placeholder="Last updated: July 2026" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Sections</label>
              {legalSections.map((section, idx) => (
                <div key={idx} className="border border-border-default rounded-xl p-3 space-y-2">
                  <Input
                    value={section.heading}
                    onChange={(e) => setLegalSections((prev) => prev.map((s, i) => i === idx ? { ...s, heading: e.target.value } : s))}
                    placeholder="Section heading…"
                    className="font-semibold"
                  />
                  <Textarea
                    rows={5}
                    value={section.body}
                    onChange={(e) => setLegalSections((prev) => prev.map((s, i) => i === idx ? { ...s, body: e.target.value } : s))}
                    placeholder="Section body (HTML)…"
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 gap-1"
                    onClick={() => setLegalSections((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-3 h-3" /> Remove section
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLegalSections((prev) => [...prev, { heading: 'New section', body: '<p></p>' }])}
              >
                + Add section
              </Button>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditLegal(null)}>Cancel</Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={updateLegalMutation.isPending}
                onClick={() => editLegal && updateLegalMutation.mutate({
                  key: editLegal.key,
                  data: { title: legalTitle, lastUpdatedLabel: legalUpdatedLabel, sections: legalSections },
                })}
              >
                <Save className="w-3.5 h-3.5" />
                {updateLegalMutation.isPending ? 'Saving…' : 'Save Page'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
