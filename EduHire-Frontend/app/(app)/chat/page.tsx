'use client';

import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { applicationsApi, type Application } from '../../../lib/api/applications';
import { chatApi, type ChatMessage } from '../../../lib/api/chat';
import { useAuth } from '../../../lib/auth-context';
import { ApplicationState } from '../../../lib/shared/enums';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function TeacherChatPage() {
  const { user, accessToken } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load PAID/WON applications
  useEffect(() => {
    applicationsApi
      .myApplications()
      .then(({ data }) => {
        const chatApps = data.filter(
          (a) => a.state === ApplicationState.PAID || a.state === ApplicationState.WON,
        );
        setApps(chatApps);
      })
      .catch(() => {});
  }, []);

  // Socket.IO connection
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${API_BASE}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [accessToken]);

  // Load history + join room when selecting a conversation
  const selectApp = useCallback(async (app: Application) => {
    setSelected(app);
    setMessages([]);
    try {
      const { data } = await chatApi.getHistory(app._id);
      setMessages(data);
    } catch { /* empty */ }
    socketRef.current?.emit('chat:join', app._id);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!selected || !text.trim() || sending) return;
    setSending(true);
    try {
      socketRef.current?.emit('chat:send', { applicationId: selected._id, text: text.trim() });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] border border-border-default rounded-2xl overflow-hidden bg-bg-card">
      {/* Conversation list */}
      <div className="w-72 shrink-0 border-r border-border-default flex flex-col">
        <div className="p-4 border-b border-border-default">
          <h2 className="text-sm font-bold text-text-primary">Messages</h2>
          <p className="text-xs text-text-muted mt-0.5">Unlocked after ₹99 confirmation</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {apps.length === 0 && (
            <p className="text-xs text-text-muted text-center py-8 px-4">
              No active chats yet. Chat unlocks after a school shortlists you and you confirm with ₹99.
            </p>
          )}
          {apps.map((app) => {
            const schoolName = app.hospital?.name ?? 'School';
            const jobTitle = app.job?.title ?? 'Job';
            const isActive = selected?._id === app._id;
            return (
              <button
                key={app._id}
                onClick={() => selectApp(app)}
                className={`w-full text-left px-4 py-3 border-b border-border-default hover:bg-bg-page transition-colors ${isActive ? 'bg-brand-primary-light' : ''}`}
              >
                <p className={`text-sm font-semibold truncate ${isActive ? 'text-brand-primary' : 'text-text-primary'}`}>
                  {schoolName}
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5">{jobTitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-muted">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-border-default">
              <p className="text-sm font-bold text-text-primary">{selected.hospital?.name ?? 'School'}</p>
              <p className="text-xs text-text-muted">{selected.job?.title}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-2xl px-3.5 py-2.5 text-sm ${isMine ? 'bg-brand-primary text-white' : 'bg-bg-page border border-border-default text-text-primary'}`}>
                      <p className="leading-snug">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70 text-right' : 'text-text-muted'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border-default flex gap-2">
              <input
                className="flex-1 rounded-xl border border-border-default px-3.5 py-2 text-sm bg-bg-page focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="Type a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
              />
              <button
                onClick={() => void handleSend()}
                disabled={!text.trim() || sending}
                className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
