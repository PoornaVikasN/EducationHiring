'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCircle, Loader2, Zap } from 'lucide-react';
import { useState } from 'react';
import { notificationsApi, type Notification } from '../../../lib/api/notifications';
import { Button } from '../../../common-components/ui/button';
import { useToast } from '../../../hooks/use-toast';
import { NotificationKind } from '../../../lib/shared/enums';

function getIcon(kind: NotificationKind) {
  if ([NotificationKind.APPLICATION_SHORTLISTED, NotificationKind.APPLICATION_WON, NotificationKind.APPLICANT_PAID].includes(kind)) {
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  }
  if ([NotificationKind.NEW_JOB_IN_LOCATION, NotificationKind.NEW_INTEREST].includes(kind)) {
    return <Zap className="w-4 h-4 text-amber-500" />;
  }
  return <Bell className="w-4 h-4 text-brand-primary" />;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationRow({ n }: { n: Notification }) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${n.read ? 'bg-bg-card border-border-default' : 'bg-brand-primary-light border-brand-primary/20'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.read ? 'bg-bg-page' : 'bg-white'}`}>
        {getIcon(n.kind)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{n.title}</p>
        <p className="text-xs text-text-muted mt-0.5">{n.body}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!n.read && <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />}
        <span className="text-xs text-text-muted whitespace-nowrap">{timeAgo(n.createdAt)}</span>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', page],
    queryFn: () => notificationsApi.list(page, 20).then((r) => r.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast({ title: 'All notifications marked as read' });
      qc.invalidateQueries({ queryKey: ['notifications-page'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast({ title: 'Failed to mark read', variant: 'destructive' }),
  });

  const unreadCount = data?.meta.unread ?? 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            {markAllMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-bg-card border border-border-default rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="bg-bg-card border border-border-default rounded-2xl p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary-light flex items-center justify-center mx-auto mb-4">
            <BellOff className="w-7 h-7 text-brand-primary" />
          </div>
          <p className="text-sm font-semibold text-text-primary mb-1">No notifications yet</p>
          <p className="text-xs text-text-muted">You'll see updates about your applications and jobs here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((n) => <NotificationRow key={n._id} n={n} />)}
          </div>

          {(data.meta.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-text-muted">Page {page} of {data.meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
