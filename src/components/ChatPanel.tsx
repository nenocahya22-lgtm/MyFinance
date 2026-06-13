import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users, Bell, BellOff } from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface ChatPanelProps {
  token: string;
  currentUser: string;
  currentName: string;
  apiBase: string;
}

export default function ChatPanel({ token, currentUser, currentName, apiBase }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) return;
    const fetchUnread = () =>
      fetch(`${apiBase}/api/chat/unread`, { headers })
        .then(r => r.json())
        .then(d => { if (!open) setUnread(d.unread || 0); })
        .catch(() => {});
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [token, open]);

  useEffect(() => {
    if (!open || !token) return;
    fetch(`${apiBase}/api/chat/messages`, { headers })
      .then(r => r.json())
      .then(d => {
        setMessages(d.messages || []);
        setUnread(0);
        fetch(`${apiBase}/api/chat/read`, { method: 'POST', headers }).catch(() => {});
      })
      .catch(() => {});
    const interval = setInterval(() => {
      fetch(`${apiBase}/api/chat/messages?limit=50`, { headers })
        .then(r => r.json())
        .then(d => setMessages(d.messages || []))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [open, token]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${apiBase}/api/chat/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        setInput('');
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
      }
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hari ini';
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  let lastDate = '';

  return (
    <>
      {/* Chat FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#494fdf] text-white shadow-lg hover:bg-[#3a40c4] transition-all flex items-center justify-center cursor-pointer"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#e23b4a] text-white text-[11px] font-bold flex items-center justify-center animate-scale-in">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          id="chat-panel"
          className="fixed bottom-24 right-5 z-40 w-[380px] max-w-[calc(100vw-40px)] h-[520px] max-h-[calc(100vh-160px)] bg-white rounded-[20px] shadow-[0_0_0_1px_#e2e2e7,0_8px_32px_rgba(0,0,0,0.12)] flex flex-col animate-scale-in overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e2e7] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#494fdf] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#191c1f] leading-tight">Obrolan Keluarga</h3>
                <p className="text-[11px] text-[#8d969e] font-medium">{messages.length} pesan</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-[#f4f4f4] flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4 text-[#505a63]" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#8d969e]">
                <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Belum ada pesan</p>
                <p className="text-xs mt-1">Mulai obrolan dengan keluarga</p>
              </div>
            )}
            {messages.map((msg) => {
              const isSelf = msg.senderId === currentUser;
              const isSystem = msg.senderId === 'SYSTEM';
              const dateLabel = formatDate(msg.createdAt);
              const showDate = dateLabel !== lastDate;
              if (showDate) lastDate = dateLabel;

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center py-1">
                      <span className="text-[10px] font-semibold text-[#8d969e] bg-[#f4f4f4] px-3 py-1 rounded-full">{dateLabel}</span>
                    </div>
                  )}
                  {isSystem ? (
                    <div className="flex justify-center py-1">
                      <span className="text-[11px] text-[#8d969e] italic">{msg.content}</span>
                    </div>
                  ) : (
                    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${isSelf ? 'chat-bubble-self' : 'chat-bubble-other'} px-3.5 py-2.5`}>
                        {!isSelf && (
                          <p className="text-[11px] font-bold text-[#494fdf] mb-0.5">{msg.senderName}</p>
                        )}
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isSelf ? 'text-white/60' : 'text-[#8d969e]'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[#e2e2e7] p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pesan..."
                className="flex-1 h-[44px] px-4 bg-[#f4f4f4] rounded-[12px] text-sm text-[#191c1f] placeholder:text-[#8d969e] outline-none border-none"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-[44px] h-[44px] rounded-full bg-[#494fdf] text-white flex items-center justify-center disabled:opacity-30 cursor-pointer shrink-0 hover:bg-[#3a40c4] transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
