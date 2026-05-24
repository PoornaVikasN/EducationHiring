'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { Suspense, useState } from 'react';
import { adminApi, type AuditLog } from '../../../lib/api/admin';
import AdminTablePagination from '../../../common-components/admin-table-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common-components/ui/select';

const ACTION_COLORS: Record<string, string> = {
  PRICE_UPDATED: 'bg-blue-100 text-blue-700',
  API_KEY_SET: 'bg-purple-100 text-purple-700',
  USER_SUSPENDED: 'bg-red-100 text-red-700',
  USER_ACTIVATED: 'bg-green-100 text-green-700',
  USER_CREATED: 'bg-teal-100 text-teal-700',
  HOSPITAL_VERIFIED: 'bg-green-100 text-green-700',
  HOSPITAL_REJECTED: 'bg-red-100 text-red-700',
  JOB_DISABLED: 'bg-orange-100 text-orange-700',
};

function formatChange(log: AuditLog): string {
  if (!log.before && !log.after) return '—';

  const before = log.before as Record<string, unknown>;
  const after = log.after as Record<string, unknown>;

  if (log.entityType === 'price') {
    const oldR = typeof before?.rupees === 'number' ? `₹${before.rupees}` : '—';
    const newR = typeof after?.rupees === 'number' ? `₹${after.rupees}` : '—';
    return `${oldR} → ${newR}`;
  }
  if (log.entityType === 'api_key') return 'Key rotated';
  if (log.action === 'USER_SUSPENDED') return 'Active → Suspended';
  if (log.action === 'USER_ACTIVATED') return 'Suspended → Active';
  if (log.action === 'USER_CREATED') return `Created (${after?.role ?? ''})`;
  if (log.action === 'HOSPITAL_VERIFIED') return `${before?.status ?? '?'} → Verified`;
  if (log.action === 'HOSPITAL_REJECTED') return `${before?.status ?? '?'} → Rejected`;
  if (log.action === 'JOB_DISABLED') return `${before?.status ?? '?'} → Disabled`;
  return JSON.stringify(after ?? {});
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ENTITY_OPTIONS = [
  { value: 'ALL', label: 'All Entities' },
  { value: 'price', label: 'Pricing' },
  { value: 'user', label: 'Users' },
  { value: 'hospital', label: 'Schools' },
  { value: 'api_key', label: 'API Keys' },
  { value: 'job', label: 'Jobs' },
];

function AuditContent() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page, entityType],
    queryFn: () => adminApi.listAuditLogs(page, 20, entityType === 'ALL' ? undefined : entityType).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Audit Log
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Track every admin action — who did what, when</p>
        </div>
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          </div>
        ) : !data?.data.length ? (
          <div className="p-10 text-center">
            <ClipboardList className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No audit entries yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-bg-page border-b border-border-default">
                  <tr>
                    {['Date / Time', 'Admin', 'Action', 'Entity', 'Change'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((log) => (
                    <tr key={log._id} className="border-b border-border-default hover:bg-bg-page transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-text-primary">{new Date(log.createdAt).toLocaleDateString('en-IN')}</p>
                        <p className="text-[11px] text-text-muted">{timeAgo(log.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">{log.adminEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-text-primary">{log.entityLabel ?? log.entityId ?? '—'}</p>
                        <p className="text-[11px] text-text-muted capitalize">{log.entityType}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted font-mono">
                        {formatChange(log)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

export default function AdminAuditPage() {
  return <Suspense><AuditContent /></Suspense>;
}
