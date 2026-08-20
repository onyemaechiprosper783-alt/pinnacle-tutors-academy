'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registerSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', exam_target: 'jamb', access_key: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const now = new Date();
  const activationRequestStart = new Date('2026-09-17T00:00:00+01:00');
  const octoberFirst = new Date('2026-10-01T00:00:00+01:00');
  const showProductKeyRequest = now < octoberFirst;
  const showActivationKeyRequest = now >= activationRequestStart;
  const whatsappNumber = '2347051101464';
  function requestKey(kind: string) { const message = encodeURIComponent(`Hello Pinnacle Tutors Academy, I would like to request a ${kind} for my student account.`); window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank'); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setServerError('');
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) { const fieldErrors: Record<string, string> = {}; parsed.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as string] = issue.message; }); setErrors(fieldErrors); return; }
    setErrors({}); setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.full_name, phone: parsed.data.phone ?? null, exam_target: parsed.data.exam_target ?? null, pending_access_key: parsed.data.access_key.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
    if (error) { setLoading(false); setServerError(error.message.includes('already registered') ? 'An account with this email already exists.' : 'Registration failed. Please check your details and try again.'); return; }
    if (!data.session) { setLoading(false); router.push('/login?registered=1'); return; }
    const { error: claimError } = await supabase.rpc('claim_access_key', { p_key_code: parsed.data.access_key.trim() });
    if (claimError) { await supabase.auth.signOut(); setLoading(false); setServerError(claimError.message || 'The Product Key or Activation Key is invalid, expired, inactive, or already used.'); return; }
    await supabase.auth.updateUser({ data: { pending_access_key: null } });
    setLoading(false); router.push('/dashboard'); router.refresh();
  }

  return <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)]"><div className="mx-auto flex min-h-[90vh] max-w-md flex-col justify-center"><div className="mb-8 text-center"><Link href="/" className="inline-flex flex-col items-center"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[var(--card)] shadow-lg ring-1 ring-[var(--border)]"><img src="/pinnacle-logo.png" alt="Pinnacle Tutors Academy" className="h-full w-full object-contain" /></div><h1 className="mt-4 text-2xl font-black">Pinnacle Tutors</h1><p className="mt-1 text-sm font-bold text-[var(--primary)]">Academy</p></Link></div><section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl sm:p-8"><h2 className="text-2xl font-black">Create your account 🚀</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Start preparing smarter for JAMB and WAEC with Pinnacle Tutors Academy.</p>{serverError && <div className="my-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}<form onSubmit={handleSubmit} noValidate><FormField label="Full name" name="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} error={errors.full_name} /><FormField label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} /><FormField label="Phone number" name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} /><div className="mb-4"><label className="mb-1.5 block text-sm font-medium">What are you preparing for?</label><select value={form.exam_target} onChange={(e) => setForm({ ...form, exam_target: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)]"><option value="jamb">JAMB / UTME</option><option value="waec">WAEC</option><option value="both">Both</option></select></div><FormField label="Password" name="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} /><FormField label="Product/Activation Key" name="access_key" value={form.access_key} onChange={(e) => setForm({ ...form, access_key: e.target.value })} error={errors.access_key} /><div className="mt-2 flex gap-2 text-xs">{showProductKeyRequest && <button type="button" onClick={() => requestKey('Product Key')} className="font-bold text-[var(--secondary)]">Request Product Key</button>}{showActivationKeyRequest && <button type="button" onClick={() => requestKey('Activation Key')} className="font-bold text-[var(--secondary)]">Request Activation Key</button>}</div><Button type="submit" fullWidth loading={loading} className="mt-4">Create account</Button></form><p className="mt-5 text-center text-sm text-[var(--muted)]">Already have an account? <Link href="/login" className="font-black text-[var(--primary)] hover:opacity-80">Log in</Link></p></section><p className="mt-6 text-center text-xs font-medium text-[var(--muted)]">© {new Date().getFullYear()} Pinnacle Tutors Academy</p></div></main>;
}
