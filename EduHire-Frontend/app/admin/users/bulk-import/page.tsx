'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, Download,
  FileSpreadsheet, Mail, Upload, Users, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import * as XLSX from 'xlsx';
import AdminTablePagination from '@/common-components/admin-table-pagination';
import { FileDropzone } from '@/common-components/file-dropzone';
import { Button } from '@/common-components/ui/button';
import { ConfirmDialog } from '@/common-components/ui/confirm-dialog';
import { IndeterminateProgressBar } from '@/common-components/ui/progress-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/common-components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { adminApi, type AuditLog } from '@/lib/api/admin';
import { checkHeadersOnly, LARGE_FILE_ROW_THRESHOLD, validateParsedRows, type ClientValidationSummary } from '@/lib/validations/bulk-import';

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

// ── Audit Log tab ─────────────────────────────────────────────────────────────

const BULK_ACTION_META: Record<string, { label: string; color: string }> = {
  BULK_USER_IMPORT: { label: 'Import ran', color: 'bg-indigo-100 text-indigo-700' },
  BULK_IMPORT_EMAILS_RESENT: { label: 'Manual resend', color: 'bg-amber-100 text-amber-700' },
  BULK_IMPORT_EMAILS_AUTO_RESENT: { label: 'Auto resend (cron)', color: 'bg-purple-100 text-purple-700' },
  BULK_IMPORT_ERRORS_DOWNLOADED: { label: 'Error report downloaded', color: 'bg-slate-100 text-slate-600' },
  BULK_IMPORT_EMAIL_STATUS_DOWNLOADED: { label: 'Email status downloaded', color: 'bg-slate-100 text-slate-600' },
};

function auditTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function BulkImportAuditRow({ log }: { log: AuditLog }) {
  const after = (log.after ?? {}) as Record<string, unknown>;
  const meta = BULK_ACTION_META[log.action] ?? { label: log.action.replace(/_/g, ' '), color: 'bg-slate-100 text-slate-600' };
  const failures = (after.failures ?? []) as Array<{ email: string; reason: string }>;
  const failuresTruncated = !!after.failuresTruncated;

  let detail: string;
  if (log.action === 'BULK_USER_IMPORT') {
    detail = `${after.successCount ?? 0}/${after.totalRows ?? 0} rows imported · ${after.emailsSent ?? 0}/${after.emailsAttempted ?? 0} emails sent`;
  } else if (log.action === 'BULK_IMPORT_EMAILS_RESENT' || log.action === 'BULK_IMPORT_EMAILS_AUTO_RESENT') {
    const attempted = after.attempted ?? after.queued ?? 0;
    detail = `${after.sent ?? 0} sent, ${after.failed ?? 0} failed (of ${attempted} attempted)`;
  } else if (log.action === 'BULK_IMPORT_ERRORS_DOWNLOADED') {
    detail = `${after.rowCount ?? 0} failed row(s) in the report`;
  } else if (log.action === 'BULK_IMPORT_EMAIL_STATUS_DOWNLOADED') {
    detail = `${after.sentCount ?? 0}/${after.userCount ?? 0} shown as sent`;
  } else {
    detail = JSON.stringify(after);
  }

  return (
    <tr className="border-b border-border-default last:border-0">
      <td className="px-4 py-3 align-top">
        <p className="text-xs font-medium text-text-primary">{new Date(log.createdAt).toLocaleString('en-IN')}</p>
        <p className="text-[11px] text-text-muted">{auditTimeAgo(log.createdAt)}</p>
      </td>
      <td className="px-4 py-3 align-top">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap', meta.color)}>{meta.label}</span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-text-muted">{log.adminEmail ?? 'System (auto)'}</td>
      <td className="px-4 py-3 align-top text-sm text-text-primary font-medium">{log.entityLabel ?? '—'}</td>
      <td className="px-4 py-3 align-top">
        <p className="text-xs text-text-muted">{detail}</p>
        {failures.length > 0 && (
          <details className="mt-1">
            <summary className="text-[11px] text-red-600 cursor-pointer hover:underline">
              Why {failures.length} failed{failuresTruncated ? ' (showing first 50)' : ''}
            </summary>
            <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
              {failures.map((f, i) => (
                <li key={i} className="text-[11px] text-text-muted">
                  <span className="font-medium text-text-primary">{f.email}</span> — {f.reason}
                </li>
              ))}
            </ul>
          </details>
        )}
      </td>
    </tr>
  );
}

function BulkImportAuditTab({ batchId, isDispatching }: { batchId: string | null; isDispatching: boolean }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['bulk-import-audit', page, batchId],
    queryFn: () => adminApi.listAuditLogs(page, 20, undefined, 'BULK_', batchId ?? undefined).then((r) => r.data),
    // Cron sweeps and background resend passes write entries with nobody watching — poll
    // lightly always, faster while a dispatch is actively in flight.
    refetchInterval: isDispatching ? 3000 : 15000,
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        {batchId
          ? 'Showing activity for the selected batch only — click a different History row (on the Import tab) to switch, or reload without a batch selected to see everything.'
          : 'Showing every bulk-import action across all batches — imports, manual resends, automatic nightly resends, and report downloads.'}
      </p>
      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          </div>
        ) : !data?.data.length ? (
          <div className="p-10 text-center">
            <FileSpreadsheet className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No bulk-import activity yet.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-bg-page border-b border-border-default">
                <tr>
                  {['Date / Time', 'Action', 'Who', 'File', 'Details'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => <BulkImportAuditRow key={log._id} log={log} />)}
              </tbody>
            </table>
            <AdminTablePagination
              page={page}
              totalPages={data.meta.totalPages}
              onPageChange={setPage}
              totalItems={data.meta.total}
              pageSize={20}
            />
          </>
        )}
      </div>
    </div>
  );
}

function BulkImportContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ClientValidationSummary | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Initialized from ?batch=<id> so a page reload (or sharing the link) keeps showing
  // the same batch's detail panel instead of losing it to a fresh, empty page load.
  const [batchId, setBatchId] = useState<string | null>(() => searchParams.get('batch'));
  const [historyPage, setHistoryPage] = useState(1);
  // While non-null and in the future, keeps polling both queries below even though the
  // batch's own status is already terminal — a Resend dispatch runs paced in the
  // background for tens of seconds after the click returns, and without this the
  // pendingEmailCount/history table would look frozen until a manual refresh.
  const [dispatchingUntil, setDispatchingUntil] = useState<number | null>(null);

  const selectBatch = (id: string | null) => {
    setBatchId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('batch', id); else params.delete('batch');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const isDispatching = dispatchingUntil !== null && Date.now() < dispatchingUntil;

  const historyQuery = useQuery({
    queryKey: ['bulk-import-history', historyPage],
    queryFn: () => adminApi.listBulkImportHistory(historyPage, 10).then((r) => r.data),
    refetchInterval: isDispatching ? 3000 : false,
  });

  // Processing now runs in the background — poll while PROCESSING or while a Resend
  // dispatch is still in flight, stop once neither applies.
  const batchQuery = useQuery({
    queryKey: ['bulk-import-batch', batchId],
    queryFn: () => adminApi.getBulkImportBatch(batchId as string).then((r) => r.data),
    enabled: !!batchId,
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' || isDispatching ? 2000 : false),
  });
  const summary = batchQuery.data ?? null;

  const templateMutation = useMutation({
    mutationFn: () => adminApi.downloadBulkImportTemplate(),
    onSuccess: (res) => triggerBlobDownload(res.data, 'bulk-user-import-template.xlsx'),
    onError: (err) => toast({ title: 'Download failed', description: extractErrorMessage(err, 'Please try again.'), variant: 'destructive' }),
  });

  const uploadMutation = useMutation({
    mutationFn: () => adminApi.bulkImportUpload(file as File),
    onSuccess: (res) => {
      selectBatch(res.data._id);
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

  const emailStatusMutation = useMutation({
    mutationFn: (batchId: string) => adminApi.downloadBulkImportEmailStatus(batchId),
    onSuccess: (res) => triggerBlobDownload(res.data, 'bulk-import-email-status.xlsx'),
    onError: (err) => toast({ title: 'Download failed', description: extractErrorMessage(err, 'Please try again.'), variant: 'destructive' }),
  });

  const resendMutation = useMutation({
    mutationFn: (targetBatchId: string) => adminApi.resendBulkImportEmails(targetBatchId),
    onSuccess: (res) => {
      toast({ title: `Dispatching ${res.data.queued} email(s)…`, description: 'Counts below will keep updating for a bit while they send.' });
      // Sends are paced in the background (not finished when this resolves) — keep both
      // queries polling for a window so pendingEmailCount actually reflects reality
      // instead of looking unchanged until someone happens to refresh.
      setDispatchingUntil(Date.now() + 120_000);
      qc.invalidateQueries({ queryKey: ['bulk-import-history'] });
      qc.invalidateQueries({ queryKey: ['bulk-import-batch'] });
    },
    onError: (err) => toast({ title: 'Resend failed', description: extractErrorMessage(err, 'Please try again.'), variant: 'destructive' }),
  });

  const handleFileSelected = async (selected: File) => {
    setFile(selected);
    selectBatch(null);
    try {
      const buffer = await selected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets['Users'] ?? workbook.Sheets[workbook.SheetNames[0]!];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: undefined });
      setValidation(
        rawRows.length > LARGE_FILE_ROW_THRESHOLD ? checkHeadersOnly(rawRows) : validateParsedRows(rawRows),
      );
    } catch {
      setValidation({ headerErrors: ['Could not read this file. Make sure it is a valid .xlsx file.'], rows: [], schoolCount: 0, teacherCount: 0, validCount: 0, invalidCount: 0, totalRowCount: 0, skippedFullValidation: false });
    }
  };

  const resetImport = () => {
    setFile(null);
    setValidation(null);
    selectBatch(null);
  };

  const canProceed = !!validation && validation.headerErrors.length === 0 && validation.invalidCount === 0 && validation.totalRowCount > 0;
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

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="w-full justify-start gap-1 h-auto bg-bg-page border border-border-default rounded-xl p-1">
          <TabsTrigger value="import" className="text-sm px-4 py-2 rounded-lg">Import</TabsTrigger>
          <TabsTrigger value="audit" className="text-sm px-4 py-2 rounded-lg">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-5 space-y-6">
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
                      {validation.totalRowCount} rows found
                      <span className="text-text-muted font-normal"> — {validation.schoolCount} School, {validation.teacherCount} Teacher</span>
                    </p>
                  </div>
                  {!validation.skippedFullValidation && (
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{validation.validCount} valid</span>
                      {validation.invalidCount > 0 && (
                        <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{validation.invalidCount} invalid</span>
                      )}
                    </div>
                  )}
                  {validation.skippedFullValidation && (
                    <p className="text-xs text-text-muted pl-6">
                      Large file detected — skipping full preview validation. Rows will be validated on the
                      server; download the Error Report after import to see any issues.
                    </p>
                  )}
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

      {summary && summary.status === 'PROCESSING' && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Import running in the background</p>
              <p className="text-xs text-text-muted mt-0.5">
                {summary.fileName} — {summary.totalRows} rows. You can leave this page; check Import History for progress.
              </p>
            </div>
          </div>
          <IndeterminateProgressBar />
        </div>
      )}

      {summary && summary.status !== 'PROCESSING' && (
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
            <StatTile label="Processing time" value={summary.processingDurationMs != null ? `${(summary.processingDurationMs / 1000).toFixed(1)}s` : '—'} icon={Clock} tone="warning" />
            <StatTile label="Emails pending" value={summary.pendingEmailCount} icon={Mail} tone={summary.pendingEmailCount > 0 ? 'warning' : 'default'} />
          </div>
          {summary.pendingEmailCount > 0 && (
            <p className="text-xs text-text-muted">
              {summary.pendingEmailCount} activation email(s) are still queued — Gmail's daily sending limit
              means large batches send in waves. Use &quot;Resend&quot; below (or from Import History) once a day
              until everyone's been emailed.
            </p>
          )}
          <div className="flex gap-2 flex-wrap pt-1">
            {summary.failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => errorReportMutation.mutate(summary._id)} disabled={errorReportMutation.isPending}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Error Report
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => emailStatusMutation.mutate(summary._id)} disabled={emailStatusMutation.isPending}>
              <Mail className="w-3.5 h-3.5 mr-1.5" /> Who Got Emailed?
            </Button>
            {summary.pendingEmailCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => resendMutation.mutate(summary._id)} disabled={resendMutation.isPending}>
                <Mail className="w-3.5 h-3.5 mr-1.5" /> Resend Pending Emails
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
                    <tr
                      key={b._id}
                      onClick={() => selectBatch(b._id)}
                      className={cn(
                        'border-b border-border-default last:border-0 hover:bg-bg-page transition-colors cursor-pointer',
                        batchId === b._id && 'bg-brand-primary-light/40',
                      )}
                    >
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">{b.fileName}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{new Date(b.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{b.totalRows}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">{b.successCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">{b.failedCount}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          b.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                          b.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
                        )}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                        {b.pendingEmailCount > 0 && (
                          <span className="block text-[11px] text-amber-600 mt-0.5">{b.pendingEmailCount} email(s) pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {b.failedCount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => errorReportMutation.mutate(b._id)} title="Download Error Report">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => emailStatusMutation.mutate(b._id)} title="Who got emailed?">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resendMutation.mutate(b._id)}
                            disabled={resendMutation.isPending || b.status === 'PROCESSING' || b.pendingEmailCount === 0}
                          >
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
        </TabsContent>

        <TabsContent value="audit" className="mt-5">
          <BulkImportAuditTab batchId={batchId} isDispatching={isDispatching} />
        </TabsContent>
      </Tabs>

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

export default function BulkImportPage() {
  return (
    <Suspense>
      <BulkImportContent />
    </Suspense>
  );
}
