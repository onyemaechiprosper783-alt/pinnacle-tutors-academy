'use client';

import { useEffect, useState } from 'react';

interface Message {
  id: string; name: string; email: string; phone: string | null;
  message: string; is_read: boolean; created_at: string;
}

export default function AdminContactPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  function load() {
    fetch('/api/admin/contact-messages').then((r) => r.json()).then(setMessages);
  }
  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await fetch(`/api/admin/contact-messages/${id}`, { method: 'PATCH' });
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Contact Messages</h1>

      {messages.length === 0 ? (
        <p className="text-slate-400">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`rounded-xl border p-4 ${m.is_read ? 'border-slate-200 bg-white' : 'border-emerald-300 bg-emerald-50'}`}>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-slate-800">{m.name} · {m.email}</p>
                {!m.is_read && (
                  <button onClick={() => markRead(m.id)} className="text-xs font-medium text-emerald-700">
                    Mark read
                  </button>
                )}
              </div>
              {m.phone && <p className="text-xs text-slate-400">{m.phone}</p>}
              <p className="mt-2 text-sm text-slate-600">{m.message}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
