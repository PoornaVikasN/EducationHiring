'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle, Filter, XCircle } from 'lucide-react';
import { Suspense, useState } from 'react';
import { adminApi, type AdminSchool } from '../../../lib/api/admin';
import { AdminSchoolDetailDialog } from '../../../common-components/admin-school-detail-dialog';
import AdminTablePagination from '../../../common-components/admin-table-pagination';
import AdminExportButton from '../../../common-components/admin-export-button';
import { SearchBar } from '../../../common-components/search-bar';
import { LocationAutocomplete } from '../../../common-components/location-autocomplete';
import { Button } from '../../../common-components/ui/button';
import { ConfirmDialog } from '../../../common-components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { DatePicker } from '../../../common-components/ui/date-picker';
import { useToast } from '../../../hooks/use-toast';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { downloadCsv } from '../../../lib/utils/export-csv';

type VerifTab = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED';

interface Filters {
  city: string;
  registeredFrom: string;
  registeredTo: string;
}

const DEFAULT_FILTERS: Filters = { city: '', registeredFrom: '', registeredTo: '' };

function activeCount(f: Filters) {
  let n = 0;
  if (f.city) n++;
  if (f.registeredFrom || f.registeredTo) n++;
  return n;
}

const VERIF_TABS: { id: VerifTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'REJECTED', label: 'Rejected' },
];

function SchoolRow({
  school,
  onVerify,
  onReject,
  onViewDetail,
}: {
  school: AdminSchool;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (h: AdminSchool) => void;
}) {
  const verified = school.isVerified;
  return (
    <tr
      className="border-b border-border-default hover:bg-bg-page transition-colors cursor-pointer"
      onClick={() => onViewDetail(school)}
    >
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">{school.name}</p>
          <p className="text-xs text-text-muted">{school.city}, {school.state}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{school.contactPhone ?? school.phone}</td>
      <td className="px-4 py-3 text-xs text-text-muted">{school.contactEmail ?? school.email}</td>
      <td className="px-4 py-3">
        {verified ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Verified</span>
        ) : school.verificationStatus === 'REJECTED' ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Rejected</span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">
        {new Date(school.createdAt).toLocaleDateString('en-IN')}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {!verified && (
            <Button size="sm" onClick={() => onVerify(school._id)}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verify
            </Button>
          )}
          {!verified && school.verificationStatus !== 'REJECTED' && (
            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => onReject(school._id)}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          )}
          {verified && (
            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => onReject(school._id)}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Revoke
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function SchoolsContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [verifTab, setVerifTab] = useState<VerifTab>('ALL');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminSchool | null>(null);
  const [detailSchool, setDetailSchool] = useState<AdminSchool | null>(null);
  const debouncedSearch = useDebouncedValue(search, 400);

  const verifiedParam =
    verifTab === 'VERIFIED' ? true :
    verifTab === 'PENDING' || verifTab === 'REJECTED' ? false :
    undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-schools', verifTab, page, debouncedSearch, filters],
    queryFn: () => adminApi.listSchools(
      page, 10,
      verifiedParam,
      debouncedSearch || undefined,
      filters.registeredFrom || undefined,
      filters.registeredTo || undefined,
    ).then((r) => r.data),
  });

  // Client-side refine for REJECTED vs PENDING (single verified boolean can't distinguish)
  const rows = (data?.data ?? []).filter((h) => {
    if (verifTab === 'REJECTED' && h.verificationStatus !== 'REJECTED') return false;
    if (verifTab === 'PENDING' && (h.isVerified || h.verificationStatus === 'REJECTED')) return false;
    if (filters.city && !h.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    return true;
  });

  const badgeCount = activeCount(filters);

  const verifyMutation = useMutation({
    mutationFn: (id: string) => adminApi.verifySchool(id),
    onSuccess: () => { toast({ title: 'School verified' }); qc.invalidateQueries({ queryKey: ['admin-schools'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectSchool(id),
    onSuccess: () => { toast({ title: 'School rejected' }); setRejectTarget(null); qc.invalidateQueries({ queryKey: ['admin-schools'] }); },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });

  const openFilter = () => { setDraft({ ...filters }); setFilterOpen(true); };
  const applyFilter = () => { setFilters(draft); setPage(1); setFilterOpen(false); };
  const clearFilter = () => { setDraft(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setPage(1); setFilterOpen(false); };

  const handleExport = () => {
    downloadCsv('admin-schools', rows, [
      { header: 'Name', key: 'name' },
      { header: 'City', key: 'city' },
      { header: 'State', key: 'state' },
      { header: 'Phone', key: (h) => h.contactPhone ?? h.phone },
      { header: 'Email', key: (h) => h.contactEmail ?? h.email },
      { header: 'Status', key: (h) => h.isVerified ? 'Verified' : (h.verificationStatus ?? 'Pending') },
      { header: 'Registered', key: (h) => new Date(h.createdAt).toLocaleDateString('en-IN') },
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><Building2 className="w-5 h-5" /> Schools</h1>
          <p className="text-sm text-text-muted mt-0.5">{rows.length} {verifTab !== 'ALL' ? verifTab.toLowerCase() : 'total'} schools</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchBar
            placeholder="Search school name…"
            onSearch={(v) => { setSearch(v); setPage(1); }}
            className="w-52"
          />
          <Button variant="outline" size="sm" className="gap-2 relative" onClick={openFilter}>
            <Filter className="w-3.5 h-3.5" />
            Filters
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] flex items-center justify-center font-bold">
                {badgeCount}
              </span>
            )}
          </Button>
          <AdminExportButton onExport={handleExport} disabled={!rows.length} />
        </div>
      </div>

      {/* Verification tabs */}
      <div className="flex gap-1 bg-bg-page rounded-xl p-1 border border-border-default">
        {VERIF_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setVerifTab(t.id); setPage(1); }}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
              verifTab === t.id ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" /></div>
        ) : !rows.length ? (
          <div className="p-10 text-center">
            <Building2 className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No schools found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-bg-page border-b border-border-default">
                  <tr>
                    {['School', 'Phone', 'Email', 'Status', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <SchoolRow
                      key={h._id}
                      school={h}
                      onVerify={(id) => verifyMutation.mutate(id)}
                      onReject={(id) => setRejectTarget(data!.data.find((x) => x._id === id) ?? null)}
                      onViewDetail={setDetailSchool}
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

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter Schools</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <LocationAutocomplete
                defaultValue={draft.city}
                placeholder="e.g. Mumbai"
                onSelect={({ city }) => setDraft((p) => ({ ...p, city }))}
                onClear={() => setDraft((p) => ({ ...p, city: '' }))}
                inputClassName="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Registration Date Range</Label>
              <DatePicker
                mode="range"
                value={draft.registeredFrom && draft.registeredTo ? `${draft.registeredFrom} - ${draft.registeredTo}` : ''}
                onSelectionChange={(val) => {
                  const [from = '', to = ''] = val ? val.split(' - ') : [];
                  setDraft((p) => ({ ...p, registeredFrom: from, registeredTo: to }));
                }}
                inputPlaceholder="Select date range"
                inputClassName="h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={clearFilter} className="flex-1">Clear</Button>
            <Button size="sm" onClick={applyFilter} className="flex-1">Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AdminSchoolDetailDialog
        school={detailSchool}
        onOpenChange={(open) => { if (!open) setDetailSchool(null); }}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
        title="Reject School"
        description={`Are you sure you want to reject "${rejectTarget?.name}"? The school will be notified.`}
        confirmLabel="Reject"
        onConfirm={() => { if (rejectTarget) rejectMutation.mutate(rejectTarget._id); }}
        loading={rejectMutation.isPending}
      />
    </div>
  );
}

export default function AdminSchoolsPage() {
  return <Suspense><SchoolsContent /></Suspense>;
}
