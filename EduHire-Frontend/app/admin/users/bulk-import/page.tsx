'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Mail, RefreshCcw, Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import AdminTablePagination from '@/common-components/admin-table-pagination';
import { FileDropzone } from '@/common-components/file-dropzone';
import { Button } from '@/common-components/ui/button';
import { Card, CardContent } from '@/common-components/ui/card';
import { ConfirmDialog } from '@/common-components/ui/confirm-dialog';
import { IndeterminateProgressBar } from '@/common-components/ui/progress-bar';
import { useToast } from '@/hooks/use-toast';
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

function StatCard({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'success' | 'danger' }) {
  const color = tone === 'success' ? 'text-green-600' : tone === 'danger' ? 'text-red-600' : 'text-text-primary';
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <p className="text-xs text-text-muted">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  return typeof msg === 'string' ? msg : fallback;
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link href="/admin/users" className="text-text-muted hover:text-text-primary">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Bulk User Import</h1>
      </div>

      {!summary && (
        <Card>
          <CardContent className="space-y-5 px-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Step 1 — Download the template</p>
                <p className="text-xs text-text-muted mt-0.5">One unified .xlsx with a User Type column (SCHOOL / TEACHER).</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => templateMutation.mutate()} disabled={templateMutation.isPending}>
                <Download className="w-3.5 h-3.5 mr-1" /> {templateMutation.isPending ? 'Preparing…' : 'Download template'}
              </Button>
            </div>

            <div>
              <p className="text-sm font-semibold text-text-primary mb-2">Step 2 — Upload the filled file</p>
              <FileDropzone
                accept=".xlsx,.xls"
                hint=".xlsx or .xls only"
                selectedFileName={file?.name}
                onFileSelected={handleFileSelected}
                disabled={uploadMutation.isPending}
              />
            </div>

            {validation && (
              <div className="rounded-xl border border-border-default p-4 space-y-2">
                {validation.headerErrors.map((e) => (
                  <p key={e} className="text-sm text-red-600 flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{e}</p>
                ))}
                {validation.headerErrors.length === 0 && (
                  <>
                    <p className="text-sm text-text-primary">
                      {validation.rows.length} rows found — {validation.schoolCount} School, {validation.teacherCount} Teacher.
                      {' '}<span className={validation.invalidCount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {validation.validCount} valid, {validation.invalidCount} invalid
                      </span>
                    </p>
                    {validation.rows.filter((r) => !r.valid).slice(0, 10).map((r) => (
                      <p key={r.rowNumber} className="text-xs text-red-600">Row {r.rowNumber}: {r.errors.join('; ')}</p>
                    ))}
                    {validation.invalidCount > 10 && (
                      <p className="text-xs text-text-muted">…and {validation.invalidCount - 10} more invalid row(s). Fix and re-upload.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <IndeterminateProgressBar />
                <p className="text-xs text-text-muted text-center">Processing… this may take a minute.</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setConfirmOpen(true)} disabled={!canProceed || uploadMutation.isPending}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Proceed to Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardContent className="space-y-5 px-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-text-primary">Import complete</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Rows" value={summary.totalRows} />
              <StatCard label="Successful" value={summary.successCount} tone="success" />
              <StatCard label="Failed" value={summary.failedCount} tone={summary.failedCount > 0 ? 'danger' : 'default'} />
              <StatCard label="Processing Time" value={`${(summary.processingDurationMs / 1000).toFixed(1)}s`} />
              <StatCard label="Emails Queued" value={summary.emailsQueued} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {summary.failedCount > 0 && (
                <Button variant="outline" size="sm" onClick={() => errorReportMutation.mutate(summary._id)} disabled={errorReportMutation.isPending}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download Error Report
                </Button>
              )}
              <Button size="sm" onClick={resetImport}>Start New Import</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <p className="text-sm font-semibold text-text-primary mb-2">Import History</p>
        <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
          {historyQuery.isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
            </div>
          ) : !historyQuery.data?.data.length ? (
            <div className="p-10 text-center text-sm text-text-muted">No imports yet.</div>
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
                    <tr key={b._id} className="border-b border-border-default">
                      <td className="px-4 py-3 text-sm text-text-primary">{b.fileName}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{new Date(b.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm">{b.totalRows}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{b.successCount}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{b.failedCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          b.status === 'FAILED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                        }`}>{b.status.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {b.failedCount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => errorReportMutation.mutate(b._id)}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => resendMutation.mutate(b._id)} disabled={resendMutation.isPending}>
                            <Mail className="w-3.5 h-3.5 mr-1" /> Resend
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
