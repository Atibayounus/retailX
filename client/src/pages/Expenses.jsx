import { useEffect, useMemo, useState } from 'react';
import { api, money } from '../api.js';
import { useUI } from '../components/ui.jsx';
import PageHeader from '../components/PageHeader.jsx';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Other'];
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
const emptyForm = () => ({ title: '', category: 'Supplies', amount: '', date: today(), note: '' });

export default function Expenses() {
  const { toast, confirm } = useUI();
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('this'); // this | last | all

  const load = () => api('/expenses').then(setExpenses).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api(editing ? `/expenses/${editing}` : '/expenses', { method: editing ? 'PUT' : 'POST', body: { ...form, amount: Number(form.amount) } });
      toast(editing ? 'Expense updated' : 'Expense added');
      setForm(emptyForm()); setEditing(null); load();
    } catch (err) { setError(err.message); }
  };

  const edit = (x) => {
    setEditing(x._id);
    setForm({ title: x.title, category: x.category, amount: x.amount, date: x.date, note: x.note || '' });
    window.scrollTo?.({ top: 0 });
  };

  const remove = async (x) => {
    const ok = await confirm({ title: `Delete "${x.title}"?`, message: "This can't be undone.", confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await api(`/expenses/${x._id}`, { method: 'DELETE' }); toast('Expense deleted'); load(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const { shown, total, byCat, thisMonth, lastMonth } = useMemo(() => {
    const now = new Date();
    const monthKey = (d) => d.toLocaleDateString('en-CA').slice(0, 7);
    const thisKey = monthKey(now);
    const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const sum = (list) => list.reduce((s, x) => s + x.amount, 0);
    const inThis = expenses.filter((x) => x.date.startsWith(thisKey));
    const inLast = expenses.filter((x) => x.date.startsWith(lastKey));
    const list = period === 'this' ? inThis : period === 'last' ? inLast : expenses;
    const cats = {};
    list.forEach((x) => { cats[x.category] = (cats[x.category] || 0) + x.amount; });
    return {
      shown: list, total: sum(list), thisMonth: sum(inThis), lastMonth: sum(inLast),
      byCat: Object.entries(cats).sort((a, b) => b[1] - a[1]),
    };
  }, [expenses, period]);

  const catMax = Math.max(...byCat.map(([, v]) => v), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <PageHeader title="Expenses" subtitle="Rent, bills, salaries and other running costs. They are subtracted from profit on the dashboard." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm font-medium text-ink/60">This month</div>
          <div className="mt-1 text-2xl font-bold text-primary">{money(thisMonth)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-ink/60">Last month</div>
          <div className="mt-1 text-2xl font-bold">{money(lastMonth)}</div>
        </div>
        <div className="card col-span-2 p-5 lg:col-span-1">
          <div className="text-sm font-medium text-ink/60">Entries recorded</div>
          <div className="mt-1 text-2xl font-bold">{expenses.length}</div>
        </div>
      </div>

      <form onSubmit={save} className="card grid items-end gap-3 p-5 sm:grid-cols-4">
        <h2 className="font-bold sm:col-span-4">{editing ? 'Edit expense' : 'Add an expense'}</h2>
        <Field label="Title"><input required maxLength={120} value={form.title} onChange={set('title')} placeholder="e.g. Shop rent" /></Field>
        <Field label="Category">
          <select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Amount"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} /></Field>
        <Field label="Date"><input required type="date" value={form.date} onChange={set('date')} /></Field>
        <div className="sm:col-span-4"><Field label="Note (optional)"><input maxLength={300} value={form.note} onChange={set('note')} /></Field></div>
        <div className="flex items-center gap-2 sm:col-span-4">
          <button className="btn btn-primary">{editing ? 'Save changes' : 'Add expense'}</button>
          {editing && <button type="button" className="btn" onClick={() => { setEditing(null); setForm(emptyForm()); setError(''); }}>Cancel</button>}
          {error && <span className="text-sm text-void" role="alert">{error}</span>}
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4">
            <h2 className="font-bold">{money(total)} <span className="text-sm font-medium text-ink/45">· {shown.length} {shown.length === 1 ? 'entry' : 'entries'}</span></h2>
            <div className="inline-flex rounded-xl bg-ink/10 p-1" role="group" aria-label="Period">
              {[['this', 'This month'], ['last', 'Last month'], ['all', 'All']].map(([k, l]) => (
                <button key={k} onClick={() => setPeriod(k)} aria-pressed={period === k}
                  className={`rounded-lg px-3 py-1 text-sm font-semibold transition-colors ${period === k ? 'bg-primary' : 'text-ink/60 hover:text-ink'}`}
                  style={period === k ? { color: '#0a0a0a' } : undefined}>{l}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Title</th><th>Category</th><th className="text-right">Amount</th><th /></tr></thead>
              <tbody>
                {shown.map((x) => (
                  <tr key={x._id}>
                    <td className="whitespace-nowrap text-ink/60">{x.date}</td>
                    <td><div className="font-semibold">{x.title}</div>{x.note && <div className="text-xs text-ink/45">{x.note}</div>}</td>
                    <td><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{x.category}</span></td>
                    <td className="text-right font-semibold">{money(x.amount)}</td>
                    <td className="space-x-2 whitespace-nowrap text-right">
                      <button className="btn btn-sm" onClick={() => edit(x)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(x)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!shown.length && <tr><td className="p-6 text-center text-ink/45" colSpan="5">{expenses.length ? 'No expenses in this period.' : 'No expenses yet. Add your first one above.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card h-fit p-5">
          <h2 className="mb-3 font-bold">By category</h2>
          {!byCat.length && <p className="text-sm text-ink/45">Nothing to show for this period.</p>}
          <ul className="space-y-3">
            {byCat.map(([c, v]) => (
              <li key={c}>
                <div className="flex justify-between text-sm"><span className="font-medium">{c}</span><span className="text-ink/60">{money(v)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-ink/10"><div className="h-2 rounded-full bg-primary" style={{ width: `${(v / catMax) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1 text-sm font-medium text-ink/70">{label}{children}</label>
);