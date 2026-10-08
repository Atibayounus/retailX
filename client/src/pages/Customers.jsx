import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useAuth } from '../auth.js';
import { useUI } from '../components/ui.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Icon } from '../components/Icon.jsx';
import { Receipt } from './POS.jsx';

const empty = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const isAdmin = user.role === 'admin';
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [history, setHistory] = useState(null); // { customer, orders }
  const [receipt, setReceipt] = useState(null);

  const load = () => api('/customers').then(setCustomers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api(editing ? `/customers/${editing}` : '/customers', { method: editing ? 'PUT' : 'POST', body: form });
      toast(editing ? 'Customer updated' : 'Customer added');
      setForm(empty); setEditing(null); load();
    } catch (err) { setError(err.message); }
  };

  const edit = (c) => {
    setEditing(c._id);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    window.scrollTo?.({ top: 0 });
  };

  const remove = async (c) => {
    const ok = await confirm({ title: `Delete ${c.name}?`, message: 'Their past receipts are kept, but will show as walk-in sales.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await api(`/customers/${c._id}`, { method: 'DELETE' }); toast('Customer deleted'); load(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const openHistory = async (c) => {
    try { setHistory({ customer: c, orders: await api(`/customers/${c._id}/orders`) }); }
    catch (err) { toast(err.message, 'error'); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const term = q.trim().toLowerCase();
  const shown = customers.filter((c) => !term || [c.name, c.phone, c.email].some((v) => v?.toLowerCase().includes(term)));
  const totalSpent = customers.reduce((s, c) => s + c.spent, 0);
  const repeat = customers.filter((c) => c.orders > 1).length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <PageHeader title="Customers" subtitle={`${customers.length} customers · ${repeat} repeat buyers · ${money(totalSpent)} lifetime spend`} />

      <form onSubmit={save} className="card grid items-end gap-3 p-5 sm:grid-cols-4">
        <h2 className="font-bold sm:col-span-4">{editing ? 'Edit customer' : 'Add a customer'}</h2>
        <Field label="Name"><input required value={form.name} onChange={set('name')} /></Field>
        <Field label="Phone"><input type="tel" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Address"><input value={form.address} onChange={set('address')} /></Field>
        <div className="sm:col-span-4"><Field label="Notes"><input value={form.notes} onChange={set('notes')} /></Field></div>
        <div className="flex items-center gap-2 sm:col-span-4">
          <button className="btn btn-primary">{editing ? 'Save changes' : 'Add customer'}</button>
          {editing && <button type="button" className="btn" onClick={() => { setEditing(null); setForm(empty); setError(''); }}>Cancel</button>}
          {error && <span className="text-sm text-void" role="alert">{error}</span>}
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="relative p-4">
          <Icon name="search" className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
          <input className="w-full !pl-10 sm:max-w-xs" placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Orders</th><th>Total spent</th><th>Last purchase</th><th /></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c._id}>
                  <td className="font-semibold">{c.name}</td>
                  <td className="text-ink/60">{c.phone}</td>
                  <td className="text-ink/60">{c.email}</td>
                  <td>{c.orders}</td>
                  <td className="font-semibold text-primary">{money(c.spent)}</td>
                  <td className="whitespace-nowrap text-ink/60">{c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</td>
                  <td className="space-x-2 whitespace-nowrap text-right">
                    <button className="btn btn-sm" onClick={() => openHistory(c)}>History</button>
                    <button className="btn btn-sm" onClick={() => edit(c)}>Edit</button>
                    {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => remove(c)}>Delete</button>}
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td className="p-6 text-center text-ink/45" colSpan="7">{customers.length ? 'No customers match your search.' : 'No customers yet. Add your first one above.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {history && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4 print:hidden" onMouseDown={(e) => e.target === e.currentTarget && setHistory(null)}>
          <div role="dialog" aria-modal="true" className="card flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden shadow-2xl">
            <div className="flex items-start justify-between border-b border-ink/10 p-5">
              <div>
                <h2 className="text-lg font-bold">{history.customer.name}</h2>
                <p className="text-sm text-ink/60">{history.customer.orders} orders · {money(history.customer.spent)} spent{history.customer.notes ? ` · ${history.customer.notes}` : ''}</p>
              </div>
              <button className="rounded-lg p-1.5 text-ink/70 hover:bg-ink/10" onClick={() => setHistory(null)} aria-label="Close"><Icon name="x" /></button>
            </div>
            <div className="overflow-auto">
              <table className="tbl">
                <thead><tr><th>Receipt</th><th>Date</th><th>Items</th><th>Total</th></tr></thead>
                <tbody>
                  {history.orders.map((o) => (
                    <tr key={o._id} className="clickable" tabIndex={0} onClick={() => setReceipt(o)} onKeyDown={(e) => e.key === 'Enter' && setReceipt(o)}>
                      <td className="font-semibold text-primary">{o.receiptNo}</td>
                      <td className="whitespace-nowrap text-ink/60">{new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                      <td className="text-ink/60">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                      <td className={`font-semibold ${o.status === 'refunded' ? 'text-ink/45 line-through' : ''}`}>{money(o.total)}</td>
                    </tr>
                  ))}
                  {!history.orders.length && <tr><td className="p-6 text-center text-ink/45" colSpan="4">No purchases yet. Pick this customer at the register to link a sale.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {receipt && <Receipt order={receipt} closeLabel="Close" onClose={() => setReceipt(null)} />}
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1 text-sm font-medium text-ink/70">{label}{children}</label>
);
