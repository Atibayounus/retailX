import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.js';
import { useUI } from '../components/ui.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Account() {
  const { user, setUser } = useAuth();
  const { toast } = useUI();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const res = await api('/auth/password', { method: 'POST', body: form });
      // Every other session is signed out; keep this one with the fresh token
      if (res.token) localStorage.setItem('token', res.token);
      if (res.user) setUser(res.user);
      setForm({ currentPassword: '', newPassword: '' });
      toast('Password changed');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="mx-auto max-w-xl p-4 lg:p-6">
      <PageHeader title="Account" subtitle={`${user.name} · ${user.email}`} />
      <form onSubmit={submit} className="card space-y-3 p-6">
        <h2 className="text-lg font-bold">Change password</h2>
        <input className="w-full" type="password" placeholder="Current password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        <input className="w-full" type="password" placeholder="New password (min 8 characters)" autoComplete="new-password" required minLength="8" maxLength="72" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        {error && <p className="rounded-lg bg-void/10 px-3 py-2 text-sm text-void" role="alert">{error}</p>}
        <p className="text-xs text-ink/60">Use at least 8 characters. Changing your password signs you out of every other device.</p>
        <button className="btn btn-primary w-full">Save password</button>
      </form>
    </div>
  );
}
