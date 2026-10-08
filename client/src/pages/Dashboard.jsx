import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import { useAuth } from '../auth.js';
import PageHeader from '../components/PageHeader.jsx';
import SalesChart from '../components/SalesChart.jsx';
import { Icon } from '../components/Icon.jsx';

const RANGES = [7, 30, 90];
const PAY_COLORS = { cash: 'bg-pay', card: 'bg-primary', wallet: 'bg-accent' };

const pctChange = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? Infinity : 0);

function Delta({ cur, prev }) {
  const p = pctChange(cur, prev);
  if (!cur && !prev) return <span className="text-ink/45">No sales yet</span>;
  if (p === Infinity) return <span className="inline-flex items-center gap-1 font-semibold text-pay"><Icon name="up" className="h-3.5 w-3.5" />New</span>;
  if (Math.abs(p) < 0.05) return <span className="text-ink/45">No change</span>;
  const up = p > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${up ? 'text-pay' : 'text-void'}`}>
      <Icon name={up ? 'up' : 'down'} className="h-3.5 w-3.5" />{Math.abs(p).toFixed(1)}%
    </span>
  );
}

function Kpi({ label, value, icon, tint, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-ink/60">{label}</div>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${tint}`}><Icon name={icon} className="h-5 w-5" /></span>
      </div>
      <div className="mt-2 truncate text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 min-h-4 text-xs text-ink/60">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api(`/orders/dashboard?days=${days}`)
      .then((d) => { if (live) { setData(d); setError(''); } })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [days]);

  const header = (
    <PageHeader title="Dashboard" subtitle={`Welcome back, ${user.name.split(' ')[0]}. Here's how your store is doing.`}>
      <Link to="/pos" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" />New sale</Link>
    </PageHeader>
  );

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl p-4 lg:p-6">
        {header}
        {error
          ? <p className="card p-4 text-void" role="alert">{error}</p>
          : <p className="p-4 text-ink/45">Loading dashboard…</p>}
      </div>
    );
  }

  const { totals, today, top, payments, recent, lowStock, lowStockCount } = data;
  const net = totals.profit - totals.expenses;
  const prevNet = totals.prevProfit - totals.prevExpenses;
  const avg = totals.orders ? totals.revenue / totals.orders : 0;
  const prevAvg = totals.prevOrders ? totals.prevRevenue / totals.prevOrders : 0;
  const payTotal = payments.reduce((s, p) => s + p.total, 0) || 1;
  const topMax = Math.max(...top.map((t) => t.qty), 1);

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      {header}
      {error && <p className="mb-4 rounded-lg bg-void/10 px-3 py-2 text-sm text-void" role="alert">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label={`Revenue, ${days} days`} value={money(totals.revenue)} icon="trend" tint="bg-primary/10 text-primary">
          <Delta cur={totals.revenue} prev={totals.prevRevenue} /> <span>vs previous {days} days</span>
        </Kpi>
        <Kpi label={`Net profit, ${days} days`} value={money(net)} icon="cash" tint="bg-pay/10 text-pay">
          <Delta cur={net} prev={prevNet} /> <span>· {money(totals.profit)} gross − {money(totals.expenses)} expenses</span>
        </Kpi>
        <Kpi label={`Orders, ${days} days`} value={totals.orders} icon="receipt" tint="bg-ink/10 text-ink">
          <Delta cur={totals.orders} prev={totals.prevOrders} /> <span>vs previous {days} days</span>
        </Kpi>
        <Kpi label="Average order" value={money(avg)} icon="cash" tint="bg-ink/10 text-ink">
          <Delta cur={avg} prev={prevAvg} /> <span>vs previous {days} days</span>
        </Kpi>
        <Kpi label="Today" value={money(today.revenue)} icon="register" tint="bg-pay/10 text-pay">
          {today.orders} {today.orders === 1 ? 'order' : 'orders'} so far today
        </Kpi>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">Total sales</h2>
              <p className="text-sm text-ink/60">Daily revenue, refunds excluded</p>
            </div>
            <div className="inline-flex rounded-xl bg-ink/10 p-1" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setDays(r)} aria-pressed={days === r}
                  className={`rounded-lg px-3 py-1 text-sm font-semibold transition-colors ${days === r ? 'bg-primary text-white' : 'text-ink/60 hover:text-ink'}`}>
                  {r} days
                </button>
              ))}
            </div>
          </div>
          <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
            <SalesChart data={data.days} />
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              Low stock
              {lowStockCount > 0 && <span className="rounded-full bg-void/15 px-2 py-0.5 text-xs font-bold text-void">{lowStockCount}</span>}
            </h2>
            <Link to="/inventory" className="text-sm font-semibold text-primary hover:underline">Manage</Link>
          </div>
          {!lowStock.length && (
            <p className="flex items-center gap-2 rounded-xl bg-pay/10 p-3 text-sm text-pay">
              <Icon name="check" className="h-4 w-4" />All products are well stocked.
            </p>
          )}
          <ul className="divide-y divide-ink/10">
            {lowStock.map((p) => (
              <li key={p._id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-ink/60">{p.category}</div>
                </div>
                <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.stock === 0 ? 'bg-void/15 text-void' : 'bg-primary/15 text-primary'}`}>
                  {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-bold">Recent orders</h2>
            <Link to="/sales" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Receipt</th><th>Time</th><th>Cashier</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o._id}>
                    <td className="font-semibold text-primary">{o.receiptNo}</td>
                    <td className="whitespace-nowrap text-ink/60">{new Date(o.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>{o.cashier?.name}</td>
                    <td className="capitalize">{o.paymentMethod}</td>
                    <td className="text-right font-semibold">
                      {o.status === 'refunded'
                        ? <span className="text-ink/45 line-through">{money(o.total)}</span>
                        : money(o.total)}
                      {o.status === 'refunded' && <span className="ml-2 rounded-full bg-void/15 px-2 py-0.5 text-xs font-bold text-void">Refunded</span>}
                    </td>
                  </tr>
                ))}
                {!recent.length && <tr><td colSpan="5" className="p-6 text-center text-ink/45">No orders yet. Completed sales show up here.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="mb-3 font-bold">Top products <span className="text-sm font-medium text-ink/45">· {days} days</span></h2>
            {!top.length && <p className="text-sm text-ink/45">No sales in this period.</p>}
            <ul className="space-y-3">
              {top.map((t) => (
                <li key={t._id}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-medium">{t._id}</span>
                    <span className="ml-3 shrink-0 text-ink/60">{t.qty} sold · {money(t.revenue)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-ink/10">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(t.qty / topMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold">Payment methods</h2>
            {!payments.length && <p className="text-sm text-ink/45">No sales in this period.</p>}
            <ul className="space-y-3">
              {payments.map((p) => (
                <li key={p._id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{p._id}</span>
                    <span className="text-ink/60">{p.orders} orders · {money(p.total)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-ink/10">
                    <div className={`h-2 rounded-full ${PAY_COLORS[p._id] || 'bg-ink/40'}`} style={{ width: `${(p.total / payTotal) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}