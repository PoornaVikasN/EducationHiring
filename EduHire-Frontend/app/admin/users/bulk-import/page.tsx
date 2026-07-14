'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, Download,
  FileSpreadsheet, Mail, Upload, Users, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import AdminTablePagination from '@/common-components/admin-table-pagination';
import { FileDropzone } from '@/common-components/file-dropzone';
import { Button } from '@/common-components/ui/button';
import { ConfirmDialog } from '@/common-components/ui/confirm-dialog';
import { IndeterminateProgressBar } from '@/common-components/ui/progress-bar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { adminApi, type ImportBatchSummary } from '@/lib/api/admin';
import { validateParsedRows, type ClientValidationSummary } from '@/lib/validations/bulk-import';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  return typeof msg === 'string' ? msg : fallback;
}

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Download template', 'Upload & validate', 'Review & import'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center bg-bg-card border border-border-default rounded-2xl px-5 py-4">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const state = step < current ? 'done' : step === current ? 'active' : 'pending';
        return (
          <div key={label} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                state === 'done' && 'bg-brand-primary text-white',
                state === 'active' && 'bg-brand-primary-light text-brand-primary border-2 border-brand-primary',
                state === 'pending' && 'bg-bg-page text-text-muted border border-border-default',
              )}>
                {state === 'done' ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:inline whitespace-nowrap',
                state === 'pending' ? 'text-text-muted' : 'text-text-primary',
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px mx-3 transition-colors', state === 'done' ? 'bg-brand-primary' : 'bg-border-default')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section header (icon badge + title) ──────────────────────────────────────

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-brand-primary-light flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-brand-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ── Stat tile (icon badge → bold value → label) ──────────────────────────────

const STAT_TONES = {
  default: { bg: 'bg-blue-100', icon: 'text-blue-600', value: 'text-text-primary' },
  success: { bg: 'bg-green-100', icon: 'text-green-600', value: 'text-green-600' },
  danger: { bg: 'bg-red-100', icon: 'text-red-600', value: 'text-red-600' },
  warning: { bg: 'bg-amber-100', icon: 'text-amber-600', value: 'text-text-primary' },
} as const;

function StatTile({ label, value, icon: Icon, tone = 'default' }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: keyof typeof STAT_TONES;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', t.bg)}>
        <Icon className={cn('w-4.5 h-4.5', t.icon)} />
      </div>
      <p className={cn('text-2xl font-bold', t.value)}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

export default function BulkImportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ClientValidationSummary | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<ImportBatchSummary | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const historyQuery = useQuery({
    queryKey: ['bulk-import-history', historyPage],
    queryFn: () => adminApi.listBulkImportHistory(historyPage, 10).then((r) => r.data),
  });

  const templateMutation = useMutation({
    mutationFn: () => adminApi.downloadBulkImportTemplate(),
    onSuccess: (res) => triggerBlobDownload(res.data, 'bulk-user-import-template.xlsx'),
    onError: (err) => toast({ title: 'Download failed', description: extractErrorMessage(err, 'Please try again.'), variant: 'destructive' }),
  });

  const uploadMutation = useMutation({
    mutationFn: () => adminApi.bulkImportUpload(file as File),
    onSuccess: (res) => {
      setSummary(res.data);
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['bulk-import-history'] });
    },
    onError: (err) => {
      setConfirmOpen(false);
      toast({ title: 'Import failed', description: extractErrorMessage(err, 'Please check the file and try again.'), variant: 'destructive' });
    },
  });

  const errorReportMutation = useMutation({
    mutationFn: (batchId: string) => adminApi.downloadBulkImportErrors(batchId),
    onSuccess: (res) => triggerBlobDownload(res.data, 'bulk-import-errors.xlsx'),
    onError: (err) => toast({ title: 'Download failed', description: extractErrorMessage(err, 'Please try again.'), variant: 'destructive' }),
  });

  const resendMutation = useMutation({
    mutationFn: (batchId: string) => adminApi.resendBulkImportEmails(batchId),
    onSuccess: (res) => toast({ title: `Resent ${res.data.queued} onboarding email(s)` }),
    onError: (err) => toast({ title: 'Resend failed', description: extractErrorMessage(err, 'Please try again.'), variant: 'destructive' }),
  });

  const handleFileSelected = async (selected: File) => {
    setFile(selected);
    setSummary(null);
    try {
      const buffer = await selected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets['Users'] ?? workbook.Sheets[workbook.SheetNames[0]!];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: undefined });
      setValidation(validateParsedRows(rawRows));
    } catch {
      setValidation({ headerErrors: ['Could not read this file. Make sure it is a valid .xlsx file.'], rows: [], schoolCount: 0, teacherCount: 0, validCount: 0, invalidCount: 0 });
    }
  };

  const resetImport = () => {
    setFile(null);
    setValidation(null);
    setSummary(null);
  };

  const canProceed = !!validation && validation.headerErrors.length === 0 && validation.invalidCount === 0 && validation.rows.length > 0;
  const isClean = !!validation && validation.headerErrors.length === 0 && validation.invalidCount === 0;
  const currentStep = summary ? 3 : file ? 2 : 1;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-text-muted hover:text-text-primary transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center shrink-0">
          <Upload className="w-5 h-5 text-brand-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Bulk User Import</h1>
          <p className="text-xs text-text-muted mt-0.5">Create School and Teacher accounts in bulk from an Excel file</p>
        </div>
      </div>

      <StepIndicator current={currentStep} />

      {!summary && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-6">
          <SectionHeader
            icon={Download}
            title="Step 1 — Download the template"
            description="One unified .xlsx with a User Type column (SCHOOL / TEACHER)."
          />
          <div className="pl-12">
            <Button variant="outline" size="sm" onClick={() => templateMutation.mutate()} disabled={templateMutation.isPending}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> {templateMutation.isPending ? 'Preparing…' : 'Download template'}
            </Button>
          </div>

          <div className="h-px bg-border-default" />

          <SectionHeader
            icon={FileSpreadsheet}
            title="Step 2 — Upload the filled file"
            description="Drag in the completed template, or click to browse."
          />
          <div className="pl-12">
            <FileDropzone
              accept=".xlsx,.xls"
              hint=".xlsx or .xls only"
              selectedFileName={file?.name}
              onFileSelected={handleFileSelected}
              disabled={uploadMutation.isPending}
              success={isClean}
            />
          </div>

          {validation && (
            <div className="pl-12">
              {validation.headerErrors.length > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1.5">
                  {validation.headerErrors.map((e) => (
                    <p key={e} className="text-sm text-red-700 flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{e}
                    </p>
                  ))}
                </div>
              ) : (
                <div className={cn(
                  'rounded-xl border p-4 space-y-2',
                  validation.invalidCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50',
                )}>
                  <div className="flex items-center gap-2">
                    {validation.invalidCount > 0
                      ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      : <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                    <p className="text-sm font-medium text-text-primary">
                      {validation.rows.length} rows found
                      <span className="text-text-muted font-normal"> — {validation.schoolCount} School, {validation.teacherCount} Teacher</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{validation.validCount} valid</span>
                    {validation.invalidCount > 0 && (
                      <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{validation.invalidCount} invalid</span>
                    )}
                  </div>
                  {validation.invalidCount > 0 && (
                    <div className="pl-6 space-y-1 pt-1">
                      {validation.rows.filter((r) => !r.valid).slice(0, 10).map((r) => (
                        <p key={r.rowNumber} className="text-xs text-amber-800">
                          <span className="font-semibold">Row {r.rowNumber}:</span> {r.errors.join('; ')}
                        </p>
                      ))}
                      {validation.invalidCount > 10 && (
                        <p className="text-xs text-text-muted">…and {validation.invalidCount - 10} more invalid row(s). Fix and re-upload.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="pl-12 space-y-2">
              <IndeterminateProgressBar />
              <p className="text-xs text-text-muted text-center">Processing… this may take a minute.</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={() => setConfirmOpen(true)} disabled={!canProceed || uploadMutation.isPending}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Proceed to Import
            </Button>
          </div>
        </div>
      )}

      {summary && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Import complete</p>
              <p className="text-xs text-text-muted mt-0.5">{summary.fileName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatTile label="Total rows" value={summary.totalRows} icon={Users} />
            <StatTile label="Successful" value={summary.successCount} icon={CheckCircle2} tone="success" />
            <StatTile label="Failed" value={summary.failedCount} icon={XCircle} tone={summary.failedCount > 0 ? 'danger' : 'default'} />
            <StatTile label="Processing time" value={`${(summary.processingDurationMs / 1000).toFixed(1)}s`} icon={Clock} tone="warning" />
            <StatTile label="Emails queued" value={summary.emailsQueued} icon={Mail} />
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            {summary.failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => errorReportMutation.mutate(summary._id)} disabled={errorReportMutation.isPending}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Error Report
              </Button>
            )}
            <Button size="sm" onClick={resetImport}>Start New Import</Button>
          </div>
        </div>
      )}

      {/* Import History */}
      <div>
        <p className="text-sm font-semibold text-text-primary mb-2">Import History</p>
        <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
          {historyQuery.isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
            </div>
          ) : !historyQuery.data?.data.length ? (
            <div className="p-10 text-center">
              <FileSpreadsheet className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">No imports yet.</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-bg-page border-b border-border-default">
                  <tr>
                    {['File', 'Date', 'Total', 'Success', 'Failed', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyQuery.data.data.map((b) => (
                    <tr key={b._id} className="border-b border-border-default last:border-0 hover:bg-bg-page transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">{b.fileName}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{new Date(b.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{b.totalRows}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">{b.successCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">{b.failedCount}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          b.status === 'FAILED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700',
                        )}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {b.failedCount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => errorReportMutation.mutate(b._id)}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => resendMutation.mutate(b._id)} disabled={resendMutation.isPending}>
                            <Mail className="w-3.5 h-3.5 mr-1.5" /> Resend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <AdminTablePagination
                page={historyPage}
                totalPages={historyQuery.data.meta.totalPages}
                onPageChange={setHistoryPage}
                totalItems={historyQuery.data.meta.total}
                pageSize={10}
              />
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm bulk import"
        description={validation ? `Import ${validation.validCount} users (${validation.schoolCount} School, ${validation.teacherCount} Teacher)? Each will receive an activation email.` : ''}
        confirmLabel="Import"
        loading={uploadMutation.isPending}
        onConfirm={() => uploadMutation.mutate()}
      />
    </div>
  );
}
