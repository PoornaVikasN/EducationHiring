'use client';

import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_ORIGIN } from '../lib/api-client';
import { notificationsApi, type Notification } from '../lib/api/notifications';

let socket: Socket | null = null;

function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(`${SOCKET_ORIGIN}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

function formatTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PAGE_SIZE = 10;

export default function NotificationsBell({
  accessToken,
  onNotification,
}: {
  accessToken: string | null;
  onNotification?: (notif: Notification) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasMore = notifications.length < total;

  // Fetch first page (replaces list — used on open + tab switch)
  const fetchFirstPage = useCallback(async (unreadOnly: boolean) => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list(1, PAGE_SIZE);
      // For unreadOnly filter, do client-side until BE supports it
      const items = unreadOnly ? data.data.filter((n) => !n.read) : data.data;
      setNotifications(items);
      setTotal(unreadOnly ? data.meta.unread : data.meta.total);
      setUnreadCount(data.meta.unread);
      setOffset(0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = Math.floor((offset + PAGE_SIZE) / PAGE_SIZE) + 1;
    setLoadingMore(true);
    try {
      const { data } = await notificationsApi.list(nextPage, PAGE_SIZE);
      const items = showUnreadOnly ? data.data.filter((n) => !n.read) : data.data;
      setNotifications((prev) => [...prev, ...items]);
      setOffset((prev) => prev + PAGE_SIZE);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset, showUnreadOnly]);

  // Open → fetch
  useEffect(() => {
    if (isOpen) fetchFirstPage(showUnreadOnly);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab switch
  const handleTabSwitch = (unreadOnly: boolean) => {
    if (unreadOnly === showUnreadOnly) return;
    setShowUnreadOnly(unreadOnly);
    setNotifications([]);
    setTotal(0);
    setOffset(0);
    fetchFirstPage(unreadOnly);
  };

  // Real-time socket
  useEffect(() => {
    if (!accessToken) return;
    const s = getSocket(accessToken);
    const handler = (notif: Notification) => {
      setUnreadCount((n) => n + 1);
      if (isOpen && !showUnreadOnly) {
        setNotifications((prev) => [notif, ...prev]);
        setTotal((t) => t + 1);
      }
      onNotification?.(notif);
    };
    s.on('notification.new', handler);
    return () => { s.off('notification.new', handler); };
  }, [accessToken, isOpen, showUnreadOnly, onNotification]);

  // Click-outside close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleItemClick = (n: Notification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => x._id === n._id ? { ...x, read: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationsApi.markRead(n._id).catch(() => {});
    }
    if (n.link) setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className={`relative p-2 rounded-full transition-all duration-200 ${isOpen ? 'bg-white/10 ring-2 ring-brand-primary' : 'hover:bg-white/10'}`}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-2xl z-[999] flex flex-col max-h-[520px] overflow-hidden"
          style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.08)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
            <h3 className="text-base font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-brand-primary hover:underline">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border-default px-4">
            {[{ label: 'All', unreadOnly: false }, { label: 'Unread', unreadOnly: true }].map(({ label, unreadOnly }) => (
              <button
                key={label}
                onClick={() => handleTabSwitch(unreadOnly)}
                className={`pb-2 mr-5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${showUnreadOnly === unreadOnly ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
              >
                {label}
                {unreadOnly && unreadCount > 0 && (
                  <span className="bg-brand-primary text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mb-3" />
                <p className="text-sm text-text-muted">Loading notifications…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-4">
                <Bell className="w-10 h-10 text-text-muted opacity-30 mb-3" />
                <p className="text-sm font-semibold text-text-primary">
                  {showUnreadOnly ? "You're all caught up!" : 'No notifications yet'}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {showUnreadOnly ? 'No unread notifications.' : "We'll notify you about applications & payments."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border-default">
                {notifications.map((n) => {
                  const content = n.link ? (
                    <Link href={n.link} onClick={() => handleItemClick(n)} className="block">
                      <NotifItem n={n} />
                    </Link>
                  ) : (
                    <button onClick={() => handleItemClick(n)} className="w-full text-left">
                      <NotifItem n={n} />
                    </button>
                  );
                  return <div key={n._id}>{content}</div>;
                })}

                {hasMore && (
                  <div className="p-3 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-1.5 mx-auto text-sm text-brand-primary hover:underline disabled:opacity-50"
                    >
                      {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {loadingMore ? 'Loading…' : `Load more (${total - notifications.length} remaining)`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && notifications.length > 0 && (
            <div className="border-t border-border-default px-4 py-2 text-center">
              <p className="text-xs text-text-muted">
                Showing {notifications.length} of {total} notification{total !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifItem({ n }: { n: Notification }) {
  return (
    <div className={`flex gap-3 px-4 py-3 transition-colors hover:bg-bg-page ${!n.read ? 'bg-brand-primary-light/20' : ''}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${!n.read ? 'bg-brand-primary' : 'bg-slate-200'}`}>
        <Bell className={`w-4 h-4 ${!n.read ? 'text-white' : 'text-text-muted'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-text-primary' : 'text-text-primary'}`}>
          {n.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-text-muted mt-1">{formatTime(n.createdAt)}</p>
      </div>
      {!n.read && <div className="shrink-0 pt-1"><div className="w-2 h-2 bg-brand-primary rounded-full" /></div>}
    </div>
  );
}
