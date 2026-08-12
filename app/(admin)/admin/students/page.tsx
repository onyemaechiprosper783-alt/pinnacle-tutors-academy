'use client';

import { useEffect, useState } from 'react';

interface Student {
  id: string; full_name: string; phone: string | null; role: string;
  exam_target: string | null; is_active: boolean;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    fetch(`/api/admin/students?${params}`).then((r) => r.json()).then(setStudents);
  }
  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePromote(id: string, currentRole: string) {
    const nextRole = currentRole === 'student' ? 'admin' : 'student';
    if (!confirm(`Change this user's role to ${nextRole}?`)) return;
    const res = await fetch('/api/admin/promote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, role: nextRole }),
    });
    if (!res.ok) { alert('Could not update role — only a super admin can grant admin access.'); return; }
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Students ({students.length})</h1>

      <input
        value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..."
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{s.full_name}</td>
                <td className="px-4 py-3 uppercase text-slate-500">{s.exam_target ?? '—'}</td>
                <td className="px-4 py-3 capitalize text-slate-500">{s.role.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-right">
                  {s.role !== 'super_admin' && (
                    <button onClick={() => togglePromote(s.id, s.role)} className="text-sm font-medium text-emerald-700">
                      {s.role === 'student' ? 'Make admin' : 'Revoke admin'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
