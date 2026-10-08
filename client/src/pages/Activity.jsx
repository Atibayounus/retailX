import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import { Icon } from '../components/Icon.jsx';

// label + tone: good = green, warn = yellow, bad = red
const ACTIONS = {
  login: ['Sign in', 'good'],
  login_failed: ['Failed sign-in', 'bad'],
  password_changed: ['Password changed', 'warn'],
  user_created: ['User added', 'warn'],
  user_updated: ['User updated', 'warn'],
  product_created: ['Product added', 'warn'],
  product_updated: ['Product edited', 'warn'],
  product_deleted: ['Product deleted', 'bad'],
  price_changed: ['Price changed', 'warn'],
  stock_changed: ['Stock changed', 'warn'],
  refund: ['Refund', 'bad'],
  customer_deleted: ['Customer deleted', 'bad'],
  expense_added: ['Expense added', 'warn'],
  expense_updated: ['Expense edited', 'warn'],
  expense_deleted: ['Expense deleted', 'bad'],
};
const TONE = { good: 'bg-pay/10 text-pay', warn: 'bg-primary/15 text-primary', bad: 'bg-void/15 text-void' };

export default function Activity() {
  const [rows, setRows] = useState([]);
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api('/activity?limit=500').then((r) => { setRows(r); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const term = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!action || r.action === action) &&
    (!term || [r.userName, r.detail].some((v) => v?.toLowerCase().includes(term))));

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <PageHeader title="Activity log" subtitle="Who signed in, changed prices, refunded sales or edited data. Entries are kept for 180 days.">
        <button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative w-full sm:max-w-xs">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
            <input className="w-full !pl-10" placeholder="Search user or detail" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select aria-label="Filter by action" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
          {error && <span className="text-sm text-void" role="alert">{error}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {shown.map((r) => {
                const [label, tone] = ACTIONS[r.action] || [r.action, 'warn'];
                return (
                  <tr key={r._id}>
                    <td className="whitespace-nowrap text-ink/60">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="font-semibold">{r.userName}</td>
                    <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[tone]}`}>{label}</span></td>
                    <td className="text-ink/70">{r.detail}</td>
                  </tr>
                );
              })}
              {!shown.length && <tr><td className="p-6 text-center text-ink/45" colSpan="4">{rows.length ? 'No entries match.' : 'No activity recorded yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}