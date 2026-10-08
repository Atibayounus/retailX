import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useUI } from '../components/ui.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Icon } from '../components/Icon.jsx';

const empty = { name: '', sku: '', category: 'General', price: '', costPrice: '', stock: '', reorderLevel: '5' };
const level = (p) => p.reorderLevel ?? 5;
const margin = (p) => (p.price > 0 && p.costPrice > 0 ? `${Math.round(((p.price - p.costPrice) / p.price) * 100)}%` : '—');

export default function Inventory() {
  const { toast, confirm } = useUI();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = () => api('/products').then(setProducts).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setError('');
    const body = { ...form, price: Number(form.price), costPrice: Number(form.costPrice || 0), stock: Number(form.stock), reorderLevel: form.reorderLevel === '' ? 5 : Number(form.reorderLevel) };
    try {
      await api(editing ? `/products/${editing}` : '/products', { method: editing ? 'PUT' : 'POST', body });
      toast(editing ? 'Product updated' : 'Product added');
      setForm(empty); setEditing(null); load();
    } catch (err) { setError(err.message); }
  };

  const edit = (p) => {
    setEditing(p._id);
    setForm({ name: p.name, sku: p.sku || '', category: p.category, price: p.price, costPrice: p.costPrice || '', stock: p.stock, reorderLevel: level(p) });
    window.scrollTo?.({ top: 0 });
  };

  const remove = async (p) => {
    const ok = await confirm({ title: `Delete ${p.name}?`, message: "This can't be undone.", confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await api(`/products/${p._id}`, { method: 'DELETE' }); toast('Product deleted'); load(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const term = q.trim().toLowerCase();
  const shown = products.filter((p) => !term || [p.name, p.sku, p.category].some((v) => v?.toLowerCase().includes(term)));
  const low = products.filter((p) => p.stock <= level(p)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <PageHeader title="Inventory" subtitle={`${products.length} products${low ? ` · ${low} low on stock` : ''}`} />

      <form onSubmit={save} className="card grid items-end gap-3 p-5 sm:grid-cols-4">
        <h2 className="font-bold sm:col-span-4">{editing ? 'Edit product' : 'Add a product'}</h2>
        <Field label="Name"><input required value={form.name} onChange={set('name')} /></Field>
        <Field label="SKU"><input value={form.sku} onChange={set('sku')} /></Field>
        <Field label="Category"><input value={form.category} onChange={set('category')} /></Field>
        <Field label="Price"><input required type="number" min="0" step="0.01" value={form.price} onChange={set('price')} /></Field>
        <Field label="Cost price"><input type="number" min="0" step="0.01" value={form.costPrice} onChange={set('costPrice')} /></Field>
        <Field label="Stock"><input required type="number" min="0" value={form.stock} onChange={set('stock')} /></Field>
        <Field label="Reorder level"><input type="number" min="0" value={form.reorderLevel} onChange={set('reorderLevel')} /></Field>
        <div className="flex items-center gap-2 sm:col-span-4">
          <button className="btn btn-primary">{editing ? 'Save changes' : 'Add product'}</button>
          {editing && <button type="button" className="btn" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
          {error && <span className="text-sm text-void" role="alert">{error}</span>}
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="relative p-4">
          <Icon name="search" className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
          <input className="w-full !pl-10 sm:max-w-xs" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th><th>Stock</th><th /></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p._id}>
                  <td className="font-semibold">{p.name}</td>
                  <td className="text-ink/60">{p.sku}</td>
                  <td><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{p.category}</span></td>
                  <td>{money(p.price)}</td>
                  <td className="text-ink/60">{p.costPrice ? money(p.costPrice) : '—'}</td>
                  <td className="text-ink/60">{margin(p)}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.stock === 0 ? 'bg-void/15 text-void' : p.stock <= level(p) ? 'bg-primary/15 text-primary' : 'bg-pay/10 text-pay'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="space-x-2 whitespace-nowrap text-right">
                    <button className="btn btn-sm" onClick={() => edit(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td className="p-6 text-center text-ink/45" colSpan="8">{products.length ? 'No products match your search.' : 'No products yet. Add your first one above.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1 text-sm font-medium text-ink/70">{label}{children}</label>
);
