'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Loader2, MessageSquare, XCircle } from 'lucide-react';
import { adminApi, type Dispute, type DisputeStatus } from '../../../lib/api/admin';
import { Button } from '../../../common-components/ui/button';
import { Textarea } from '../../../common-components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common-components/ui/select';
import { useToast } from '../../../hooks/use-toast';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE: Record<DisputeStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  OPEN: { label: 'Open', bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  IN_REVIEW: { label: 'In Review', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  RESOLVED: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', bg: 'bg-slate-100', text: 'text-slate-600', icon: XCircle },
};

function StatusBadge({ status }: { status: DisputeStatus }) {
  const { label, bg, text, icon: Icon } = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function DisputeRow({ dispute, onAction }: { dispute: Dispute; onAction: (id: string, action: 'review' | 'resolve' | 'reject', note?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const raisedName =
    dispute.raisedBy?.seekerProfile?.fullName ??
    dispute.raisedBy?.recruiterProfile?.fullName ??
    dispute.raisedBy?.email ??
    'Unknown';

  return (
    <div className="border border-border-default rounded-xl overflow-hidden bg-white">
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-bg-page transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare className="w-4 h-4 text-brand-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-text-primary truncate">{dispute.subject}</span>
            <StatusBadge status={dispute.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
            <span>{dispute.kind.replace(/_/g, ' ')}</span>
            <span>·</span>
            <span>{raisedName}</span>
            <span>·</span>
            <span>{new Date(dispute.createdAt).toLocaleDateString('en-IN')}</span>
            {dispute.referenceId && <><span>·</span><span className="font-mono">{dispute.referenceId}</span></>}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border-default bg-bg-page space-y-4 pt-4">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{dispute.description}</p>
          </div>

          {dispute.adminNote && (
            <div className="bg-white border border-border-default rounded-xl p-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Admin Note</p>
              <p className="text-sm text-text-primary">{dispute.adminNote}</p>
            </div>
          )}

          {(dispute.status === 'OPEN' || dispute.status === 'IN_REVIEW') && (
            <div className="space-y-3">
              {dispute.status === 'OPEN' && (
                <Button size="sm" variant="outline" onClick={() => onAction(dispute._id, 'review')}>
                  Mark In Review
                </Button>
              )}
              <div>
                <Textarea
                  placeholder="Admin note (required to resolve or reject)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={note.trim().length < 5}
                  onClick={() => { onAction(dispute._id, 'resolve', note); setNote(''); }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={note.trim().length < 5}
                  onClick={() => { onAction(dispute._id, 'reject', note); setNote(''); }}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDisputesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'ALL'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-disputes', page, statusFilter],
    queryFn: () => adminApi.listDisputes(page, 20, statusFilter === 'ALL' ? undefined : statusFilter as DisputeStatus).then((r) => r.data),
  });

  const handleAction = async (id: string, action: 'review' | 'resolve' | 'reject', note?: string) => {
    setActionLoading(id + action);
    try {
      if (action === 'review') await adminApi.reviewDispute(id);
      else if (action === 'resolve') await adminApi.resolveDispute(id, note!);
      else await adminApi.rejectDispute(id, note!);
      toast({ title: action === 'review' ? 'Marked In Review' : action === 'resolve' ? 'Dispute Resolved' : 'Dispute Rejected' });
      qc.invalidateQueries({ queryKey: ['admin-disputes'] });
    } catch {
      toast({ title: 'Failed', description: 'Action could not be completed.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const { totalPages = 1, total = 0 } = data?.meta ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Disputes</h1>
        <p className="text-text-muted text-sm mt-1">Review and resolve user-raised disputes.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as DisputeStatus | 'ALL'); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {total > 0 && <span className="text-sm text-text-muted">{total} dispute{total !== 1 ? 's' : ''}</span>}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-white border border-border-default rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="bg-white rounded-2xl border border-border-default p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-text-primary font-semibold">No disputes</p>
          <p className="text-sm text-text-muted mt-1">
            {statusFilter ? `No ${statusFilter.toLowerCase()} disputes.` : 'All clear — no disputes raised yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((d) => (
            <DisputeRow key={d._id} dispute={d} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
