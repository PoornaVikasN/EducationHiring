'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Filter, Search, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { jobsApi, type Job } from '../../../lib/api/jobs';
import { AdminJobDetailDialog } from '../../../common-components/admin-job-detail-dialog';
import AdminTablePagination from '../../../common-components/admin-table-pagination';
import AdminExportButton from '../../../common-components/admin-export-button';
import { LocationAutocomplete } from '../../../common-components/location-autocomplete';
import { Button } from '../../../common-components/ui/button';
import { ConfirmDialog } from '../../../common-components/ui/confirm-dialog';
import { DatePicker } from '../../../common-components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { Input } from '../../../common-components/ui/input';
import { enumLabel } from '../../../lib/utils/enum-options';
import { Label } from '../../../common-components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common-components/ui/select';
import { useToast } from '../../../hooks/use-toast';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { JobStatus } from '../../../lib/shared/enums';
import { JOB_STATUS_BADGE } from '../../../lib/shared/constants';
import { downloadCsv } from '../../../lib/utils/export-csv';

const STATUS_BADGE = JOB_STATUS_BADGE;

interface Filters {
  status: string;
  city: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: Filters = { status: 'ALL', city: '', dateFrom: '', dateTo: '' };

function activeFilterCount(f: Filters) {
  let n = 0;
  if (f.status !== 'ALL') n++;
  if (f.city) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

function JobRow({
  job,
  onDisable,
  onViewDetail,
}: {
  job: Job;
  onDisable: (id: string) => void;
  onViewDetail: (job: Job) => void;
}) {
  const badge = STATUS_BADGE[job.status];
  return (
    <tr
      className="border-b border-border-default hover:bg-bg-page transition-colors cursor-pointer"
      onClick={() => onViewDetail(job)}
    >
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-text-primary">{job.title}</p>
        <p className="text-xs text-text-muted">{job.school?.name ?? '—'}</p>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{job.city}, {job.state}</td>
      <td className="px-4 py-3 text-xs text-text-muted">{enumLabel(job.role)} · {enumLabel(job.department)}</td>
      <td className="px-4 py-3 text-xs text-text-muted text-center">{job.filledPositions ?? 0}/{job.openPositions ?? 1}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{new Date(job.createdAt).toLocaleDateString('en-IN')}</td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {job.status !== JobStatus.DISABLED_BY_ADMIN && (
          <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => onDisable(job._id)}>
            <ShieldOff className="w-3.5 h-3.5 mr-1" /> Disable
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function AdminJobsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [disableTarget, setDisableTarget] = useState<Job | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs', page, debouncedSearch, filters],
    queryFn: () => jobsApi.adminList({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: filters.status === 'ALL' ? undefined : filters.status as JobStatus,
      city: filters.city || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }).then((r) => r.data),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => jobsApi.adminDisable(id),
    onSuccess: () => { toast({ title: 'Job disabled' }); setDisableTarget(null); qc.invalidateQueries({ queryKey: ['admin-jobs'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });

  const applyFilter = () => { setFilters(draft); setPage(1); setFilterOpen(false); };
  const clearFilter = () => { setDraft(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setPage(1); setFilterOpen(false); };

  const activeCount = activeFilterCount(filters);

  const handleExport = () => {
    downloadCsv('admin-jobs', data?.data ?? [], [
      { header: 'Title', key: 'title' },
      { header: 'Status', key: (j) => STATUS_BADGE[j.status]?.label ?? j.status },
      { header: 'School', key: (j) => j.school?.name ?? '' },
      { header: 'City', key: 'city' },
      { header: 'Department', key: 'department' },
      { header: 'Role', key: 'role' },
      { header: 'Filled', key: (j) => String(j.filledPositions ?? 0) },
      { header: 'Open', key: (j) => String(j.openPositions ?? 1) },
      { header: 'Posted', key: (j) => new Date(j.createdAt).toLocaleDateString('en-IN') },
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><Briefcase className="w-5 h-5" /> Jobs</h1>
          <p className="text-sm text-text-muted mt-0.5">{data?.meta.total ?? 0} total jobs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input className="pl-9 w-52" placeholder="Search title, role…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => { setDraft(filters); setFilterOpen(true); }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </Button>
          <AdminExportButton onExport={handleExport} disabled={!data?.data.length} />
        </div>
      </div>

      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" /></div>
        ) : !data?.data.length ? (
          <div className="p-10 text-center">
            <Briefcase className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No jobs found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-bg-page border-b border-border-default">
                  <tr>
                    {['Job', 'Location', 'Role', 'Filled/Open', 'Status', 'Posted', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((j) => (
                    <JobRow
                      key={j._id}
                      job={j}
                      onDisable={(id) => setDisableTarget(data.data.find((x) => x._id === id) ?? null)}
                      onViewDetail={setDetailJob}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <AdminTablePagination
              page={page}
              totalPages={data?.meta.totalPages ?? 1}
              onPageChange={setPage}
              totalItems={data?.meta.total}
              pageSize={10}
            />
          </>
        )}
      </div>

      {/* Filter modal */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter Jobs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {Object.entries(STATUS_BADGE).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <LocationAutocomplete
                defaultValue={draft.city}
                placeholder="e.g. Hyderabad"
                onSelect={({ city }) => setDraft((p) => ({ ...p, city }))}
                onClear={() => setDraft((p) => ({ ...p, city: '' }))}
                inputClassName="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Posted Date Range</Label>
              <DatePicker
                mode="range"
                value={draft.dateFrom && draft.dateTo ? `${draft.dateFrom} - ${draft.dateTo}` : ''}
                onSelectionChange={(val) => {
                  const [from = '', to = ''] = val ? val.split(' - ') : [];
                  setDraft((p) => ({ ...p, dateFrom: from, dateTo: to }));
                }}
                inputPlaceholder="Select date range"
                inputClassName="h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={clearFilter}>Clear</Button>
            <Button className="flex-1" onClick={applyFilter}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AdminJobDetailDialog job={detailJob} onOpenChange={(open) => { if (!open) setDetailJob(null); }} />

      <ConfirmDialog
        open={!!disableTarget}
        onOpenChange={(open) => { if (!open) setDisableTarget(null); }}
        title="Disable Job"
        description={`Are you sure you want to disable "${disableTarget?.title}"? It will be hidden from all candidates.`}
        confirmLabel="Disable"
        onConfirm={() => { if (disableTarget) disableMutation.mutate(disableTarget._id); }}
        loading={disableMutation.isPending}
      />
    </div>
  );
}
