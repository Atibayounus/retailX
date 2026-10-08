import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.js';
import { useUI } from '../components/ui.jsx';
import PageHeader from '../components/PageHeader.jsx';

const empty = { name: '', email: '', password: '', role: 'cashier' };

export default function Users() {
  const { user: me } = useAuth();
  const { toast, prompt } = useUI();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => api('/auth/users').then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault(); setError('');
    try { await api('/auth/register', { method: 'POST', body: form }); toast('User added'); setForm(empty); load(); }
    catch (err) { setError(err.message); }
  };

  const update = async (u, body, message) => {
    setError('');
    try { await api(`/auth/users/${u._id}`, { method: 'PUT', body }); if (message) toast(message); load(); }
    catch (err) { setError(err.message); }
  };

  const resetPassword = async (u) => {
    const password = await prompt({
      title: `Reset password for ${u.name}`, message: 'Choose a temporary password (min 8 characters). They will be asked to change it, and any device they are signed in on is signed out.',
      type: 'password', minLength: 8, placeholder: 'New password', confirmLabel: 'Reset password',
    });
    if (password) update(u, { password }, 'Password reset');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <PageHeader title="Users" subtitle="Manage who can sign in to retailX" />

      <form onSubmit={create} className="card grid items-end gap-3 p-5 sm:grid-cols-5">
        <h2 className="font-bold sm:col-span-5">Add a user</h2>
        <F label="Name"><input required value={form.name} onChange={set('name')} /></F>
        <F label="Email"><input required type="email" value={form.email} onChange={set('email')} /></F>
        <F label="Password"><input required type="password" minLength="8" maxLength="72" autoComplete="new-password" value={form.password} onChange={set('password')} /></F>
        <F label="Role">
          <select value={form.role} onChange={set('role')}><option value="cashier">Cashier</option><option value="admin">Admin</option></select>
        </F>
        <button className="btn btn-primary">Add user</button>
        {error && <p className="text-sm text-void sm:col-span-5" role="alert">{error}</p>}
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id}>
                    <td className="font-semibold">{u.name}{self && <span className="font-normal text-ink/45"> (you)</span>}</td>
                    <td className="text-ink/60">{u.email}</td>
                    <td>
                      <select className="!py-1" value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value }, 'Role updated')}>
                        <option value="cashier">Cashier</option><option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${u.active ? 'bg-pay/10 text-pay' : 'bg-void/15 text-void'}`}>
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="space-x-2 whitespace-nowrap text-right">
                      <button className="btn btn-sm" onClick={() => resetPassword(u)}>Reset password</button>
                      <button className="btn btn-sm" disabled={self} onClick={() => update(u, { active: !u.active }, u.active ? 'User disabled' : 'User enabled')}>{u.active ? 'Disable' : 'Enable'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const F = ({ label, children }) => (
  <label className="flex flex-col gap-1 text-sm font-medium text-ink/70">{label}{children}</label>
);
