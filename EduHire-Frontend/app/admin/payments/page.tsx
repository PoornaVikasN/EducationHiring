'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Filter } from 'lucide-react';
import { useState } from 'react';
import { adminApi, type PaymentRecord } from '../../../lib/api/admin';
import AdminTablePagination from '../../../common-components/admin-table-pagination';
import AdminExportButton from '../../../common-components/admin-export-button';
import { Button } from '../../../common-components/ui/button';
import { DatePicker } from '../../../common-components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { Label } from '../../../common-components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common-components/ui/select';
import { formatRupees } from '../../../lib/shared/constants';
import { PaymentKind, PaymentStatus } from '../../../lib/shared/enums';
import { downloadCsv } from '../../../lib/utils/export-csv';

const KIND_LABEL: Record<PaymentKind, string> = {
  [PaymentKind.JOB_POST]: 'Job Post',
  [PaymentKind.APPLICATION]: 'Application',
  [PaymentKind.SUBSCRIPTION]: 'Subscription',
  [PaymentKind.SEEKER_SOS_SUBSCRIPTION]: 'Teacher Subscription',
  [PaymentKind.BOOST]: 'Boost',
};

const STATUS_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  [PaymentStatus.PAID]: { label: 'Paid', cls: 'bg-green-100 text-green-700' },
  [PaymentStatus.PENDING]: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  [PaymentStatus.FAILED]: { label: 'Failed', cls: 'bg-red-100 text-red-600' },
  [PaymentStatus.REFUNDED]: { label: 'Refunded', cls: 'bg-slate-100 text-slate-500' },
};

interface Filters {
  kind: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: Filters = { kind: 'ALL', status: 'ALL', dateFrom: '', dateTo: '' };

function activeFilterCount(f: Filters) {
  let n = 0;
  if (f.kind !== 'ALL') n++;
  if (f.status !== 'ALL') n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  const badge = STATUS_BADGE[payment.status as PaymentStatus];
  const kindLabel = KIND_LABEL[payment.kind as PaymentKind] ?? payment.kind;
  const userName = payment.user?.fullName ?? payment.user?.email ?? '—';
  const shortPaymentId = payment.razorpayPaymentId
    ? payment.razorpayPaymentId.slice(0, 8) + '…'
    : '—';

  return (
    <tr className="border-b border-border-default hover:bg-bg-page transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-text-primary">{userName}</p>
        {payment.user?.email && payment.user.fullName && (
          <p className="text-xs text-text-muted">{payment.user.email}</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs font-mono text-text-muted truncate max-w-[160px]">{payment.razorpayOrderId}</td>
      <td className="px-4 py-3 font-mono text-xs text-text-muted">{shortPaymentId}</td>
      <td className="px-4 py-3">
        <span className="text-xs font-medium text-text-primary">{kindLabel}</span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-text-primary">
        {payment.amountPaise != null ? formatRupees(payment.amountPaise) : '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge?.cls ?? 'bg-slate-100 text-slate-500'}`}>{badge?.label ?? payment.status}</span>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{new Date(payment.createdAt).toLocaleDateString('en-IN')}</td>
    </tr>
  );
}

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page, filters],
    queryFn: () => adminApi.listAdminPayments(
      page, 10,
      filters.kind === 'ALL' ? undefined : filters.kind,
      filters.status === 'ALL' ? undefined : filters.status,
      filters.dateFrom || undefined,
      filters.dateTo || undefined,
    ).then((r) => r.data),
  });

  const applyFilter = () => { setFilters(draft); setPage(1); setFilterOpen(false); };
  const clearFilter = () => { setDraft(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setPage(1); setFilterOpen(false); };

  const activeCount = activeFilterCount(filters);

  const handleExport = () => {
    downloadCsv('admin-payments', data?.data ?? [], [
      { header: 'User', key: (p) => p.user?.fullName ?? p.user?.email ?? '' },
      { header: 'Email', key: (p) => p.user?.email ?? '' },
      { header: 'Kind', key: (p) => KIND_LABEL[p.kind as PaymentKind] ?? p.kind },
      { header: 'Amount (₹)', key: (p) => p.amountPaise != null ? String(p.amountPaise / 100) : '' },
      { header: 'Order ID', key: 'razorpayOrderId' },
      { header: 'Payment ID', key: (p) => p.razorpayPaymentId ?? '' },
      { header: 'Status', key: (p) => STATUS_BADGE[p.status as PaymentStatus]?.label ?? p.status },
      { header: 'Date', key: (p) => new Date(p.createdAt).toLocaleDateString('en-IN') },
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payments</h1>
          <p className="text-sm text-text-muted mt-0.5">{data?.meta.total ?? 0} total transactions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            <CreditCard className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No payment records found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-bg-page border-b border-border-default">
                  <tr>
                    {['User', 'Order ID', 'Payment ID', 'Type', 'Amount', 'Status', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) => <PaymentRow key={p._id} payment={p} />)}
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
            <DialogTitle>Filter Payments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Type</Label>
              <Select value={draft.kind} onValueChange={(v) => setDraft((p) => ({ ...p, kind: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {Object.entries(KIND_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {Object.entries(STATUS_BADGE).map(([k, { label }]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Date Range</Label>
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
    </div>
  );
}
