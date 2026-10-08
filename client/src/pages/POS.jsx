import { useEffect, useMemo, useState } from 'react';
import { api, money, BRAND } from '../api.js';
import { useUI } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

export default function POS() {
  const { toast, prompt } = useUI();
  const [products, setProducts] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]); // [{ product, qty }]
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState('cash');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  // Sales put on hold (e.g. a customer went to fetch their wallet) survive a page refresh
  const [held, setHeld] = useState(() => { try { return JSON.parse(localStorage.getItem('held-sales') || '[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem('held-sales', JSON.stringify(held)); }, [held]);

  const load = () => api('/products').then(setProducts).catch((e) => setError(e.message));
  useEffect(() => {
    load(); api('/config').then((c) => setTaxRate(c.taxRate));
    api('/customers').then(setCustomers).catch(() => {});
  }, []);

  const addCustomer = async () => {
    const name = await prompt({ title: 'New customer', message: 'Enter the customer name. You can add phone and email later in Customers.', placeholder: 'Full name', confirmLabel: 'Add' });
    if (!name?.trim()) return;
    try {
      const c = await api('/customers', { method: 'POST', body: { name } });
      setCustomers((cs) => [...cs, c].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomerId(c._id); toast('Customer added');
    } catch (e) { toast(e.message, 'error'); }
  };

  const hold = () => {
    setHeld((h) => [...h, { id: Date.now(), cart, customerId, discount, at: Date.now() }]);
    setCart([]); setDiscount(''); setCustomerId(''); setError('');
    toast('Sale put on hold', 'info');
  };

  const resume = (h) => {
    // Re-check against current stock, since it may have changed while the sale was on hold
    const fresh = h.cart
      .map((l) => { const p = products.find((x) => x._id === l.product._id); return p && p.stock > 0 ? { product: p, qty: Math.min(l.qty, p.stock) } : null; })
      .filter(Boolean);
    setCart(fresh); setDiscount(h.discount || '');
    setCustomerId(customers.some((c) => c._id === h.customerId) ? h.customerId : '');
    setHeld((hs) => hs.filter((x) => x.id !== h.id));
    if (fresh.length < h.cart.length || fresh.some((l, i) => l.qty < h.cart[i]?.qty)) toast('Some items changed in stock and were adjusted', 'info');
  };

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);
  const shown = products.filter(
    (p) => (category === 'All' || p.category === category) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) || p.sku?.toLowerCase() === q.trim().toLowerCase())
  );

  // Barcode scanners type the SKU then press Enter: add the exact SKU match (or the only result)
  const onSearchKey = (e) => {
    if (e.key !== 'Enter' || !q.trim()) return;
    const term = q.trim().toLowerCase();
    const hit = products.find((p) => p.sku?.toLowerCase() === term) || (shown.length === 1 ? shown[0] : null);
    if (!hit) return setError(`No product found for "${q.trim()}"`);
    if (hit.stock - qtyInCart(hit._id) <= 0) return setError(`${hit.name} is out of stock`);
    add(hit); setQ('');
  };

  const qtyInCart = (id) => cart.find((c) => c.product._id === id)?.qty || 0;

  const add = (product) => {
    if (qtyInCart(product._id) >= product.stock) return;
    setError('');
    setCart((c) => c.some((l) => l.product._id === product._id)
      ? c.map((l) => (l.product._id === product._id ? { ...l, qty: l.qty + 1 } : l))
      : [...c, { product, qty: 1 }]);
  };

  const change = (id, delta) =>
    setCart((c) => c
      .map((l) => (l.product._id === id ? { ...l, qty: Math.min(l.qty + delta, l.product.stock) } : l))
      .filter((l) => l.qty > 0));

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = Math.round((subtotal - disc) * taxRate * 100) / 100;
  const total = subtotal - disc + tax;
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  const checkout = async () => {
    setBusy(true); setError('');
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: { items: cart.map((l) => ({ product: l.product._id, qty: l.qty })), discount: disc, paymentMethod: payment, customer: customerId || undefined },
      });
      setReceipt(order); setCart([]); setDiscount(''); setCustomerId('');
      toast(`Sale ${order.receiptNo} completed`);
      load();
    } catch (e) { setError(e.message); load(); }
    setBusy(false);
  };

  return (
    <div className="grid gap-4 p-4 lg:h-full lg:grid-cols-[1fr_380px] lg:p-6 print:block">
      <section className="flex min-h-0 flex-col print:hidden">
        <div className="relative mb-3">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
          <input className="w-full !py-3 !pl-10" autoFocus placeholder="Search, or scan a barcode / type SKU and press Enter" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-full border px-3.5 py-1 text-sm font-semibold transition-colors ${category === c ? 'border-primary bg-primary text-white' : 'border-ink/10 bg-card text-ink/70 hover:border-primary/40 hover:bg-primary/10'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 content-start gap-3 pr-1 sm:grid-cols-3 xl:grid-cols-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {shown.map((p) => {
            const out = p.stock - qtyInCart(p._id) <= 0;
            return (
              <button key={p._id} onClick={() => add(p)} disabled={out}
                className="card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:border-ink/10 disabled:hover:shadow-none">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{p.category}</span>
                <div className="mt-2 font-semibold leading-snug">{p.name}</div>
                <div className="mt-1 font-bold text-primary">{money(p.price)}</div>
                <div className={`mt-2 text-xs font-medium ${p.stock <= (p.reorderLevel ?? 5) ? 'text-void' : 'text-ink/60'}`}>
                  {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                </div>
              </button>
            );
          })}
          {!shown.length && <p className="col-span-full text-ink/45">No products match. Add some in Inventory.</p>}
        </div>
      </section>

      <aside className="card flex min-h-0 flex-col overflow-hidden print:hidden">
        <h2 className="flex items-center justify-between border-b border-ink/10 bg-ink/5 px-4 py-3 font-bold">
          Current sale
          {itemCount > 0 && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>}
        </h2>
        <div className="flex items-center gap-2 border-b border-ink/10 px-4 py-2.5">
          <select className="min-w-0 flex-1 !py-1.5" aria-label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
          </select>
          <button className="btn btn-sm shrink-0" onClick={addCustomer}>+ New</button>
        </div>
        {held.length > 0 && (
          <div className="space-y-1.5 border-b border-ink/10 bg-ink/5 px-4 py-2.5 text-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-ink/60">On hold ({held.length})</div>
            {held.map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {h.cart.reduce((s, l) => s + l.qty, 0)} items · {new Date(h.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button className="btn btn-sm" disabled={cart.length > 0} title={cart.length ? 'Hold or clear the current sale first' : ''} onClick={() => resume(h)}>Resume</button>
                <button className="btn btn-sm btn-danger" aria-label="Discard held sale" onClick={() => setHeld((hs) => hs.filter((x) => x.id !== h.id))}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="max-h-72 flex-1 divide-y divide-ink/10 overflow-y-auto lg:max-h-none">
          {!cart.length && <p className="p-6 text-center text-sm text-ink/45">Tap a product to add it to the sale.</p>}
          {cart.map((l) => (
            <div key={l.product._id} className="flex items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{l.product.name}</div>
                <div className="text-xs text-ink/60">{money(l.product.price)} each</div>
              </div>
              <button className="btn btn-sm !px-2.5" onClick={() => change(l.product._id, -1)} aria-label={`Remove one ${l.product.name}`}>−</button>
              <span className="w-6 text-center font-semibold">{l.qty}</span>
              <button className="btn btn-sm !px-2.5" onClick={() => change(l.product._id, 1)} aria-label={`Add one ${l.product.name}`}>+</button>
              <span className="w-20 text-right font-semibold">{money(l.product.price * l.qty)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-ink/10 p-4 text-sm">
          <Row label="Subtotal" value={money(subtotal)} />
          <div className="flex items-center justify-between">
            <label htmlFor="disc" className="text-ink/60">Discount</label>
            <input id="disc" type="number" min="0" className="w-28 text-right !py-1" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
          </div>
          {taxRate > 0 && <Row label={`Tax (${(taxRate * 100).toFixed(0)}%)`} value={money(tax)} />}
          <div className="flex justify-between border-t border-ink/10 pt-3 text-xl font-bold">
            <span>Total</span><span className="grad-text">{money(total)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            {['cash', 'card', 'wallet'].map((m) => (
              <button key={m} onClick={() => setPayment(m)} aria-pressed={payment === m}
                className={`flex-1 rounded-xl border py-2 font-semibold capitalize transition-colors ${payment === m ? 'border-primary bg-primary/10 text-primary' : 'border-ink/10 text-ink/60 hover:bg-ink/5'}`}>{m}</button>
            ))}
          </div>
          {error && <p className="rounded-lg bg-void/10 px-3 py-2 text-void" role="alert">{error}</p>}
          <button className="btn btn-pay w-full !py-3 text-base" disabled={!cart.length || busy} onClick={checkout}>
            {busy ? 'Processing…' : `Charge ${money(total)}`}
          </button>
          {!!cart.length && (
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={hold}>Hold sale</button>
              <button className="btn flex-1" onClick={() => setCart([])}>Clear sale</button>
            </div>
          )}
        </div>
      </aside>

      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between text-ink/60"><span>{label}</span><span>{value}</span></div>
);

export function Receipt({ order, onClose, onRefund, closeLabel = 'New sale' }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 print:static print:block print:bg-transparent">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-ink/15 bg-card shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="grad-brand h-1.5 print:hidden" />
        <div id="receipt" className="space-y-2 p-5 text-sm">
          <p className="text-center text-lg font-semibold tracking-tight">retail<span className="font-extrabold">X</span></p>
          <h2 className="text-center font-bold">Receipt {order.receiptNo}</h2>
          {order.status === 'refunded' && <p className="text-center font-bold text-void">REFUNDED</p>}
          <p className="text-center text-xs text-ink/60">
            {new Date(order.createdAt).toLocaleString()} · Cashier: {order.cashier?.name}
          </p>
          {order.customer?.name && <p className="text-center text-xs text-ink/60">Customer: {order.customer.name}</p>}
          <hr className="border-ink/10" />
          {order.items.map((i, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{i.qty} × {i.name}</span><span>{money(i.price * i.qty)}</span>
            </div>
          ))}
          <hr className="border-ink/10" />
          <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>−{money(order.discount)}</span></div>}
          {order.tax > 0 && <div className="flex justify-between"><span>Tax</span><span>{money(order.tax)}</span></div>}
          <div className="flex justify-between text-base font-bold"><span>Total ({order.paymentMethod})</span><span>{money(order.total)}</span></div>
          <p className="pt-2 text-center">Thank you for shopping with {BRAND}!</p>
        </div>
        <div className="flex gap-2 border-t border-ink/10 bg-ink/5 p-4 print:hidden">
          <button className="btn flex-1" onClick={() => window.print()}>Print</button>
          {onRefund && <button className="btn btn-danger flex-1" onClick={onRefund}>Refund</button>}
          <button className="btn btn-primary flex-1" onClick={onClose}>{closeLabel}</button>
        </div>
      </div>
    </div>
  );
}
