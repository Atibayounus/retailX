import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useUI } from '../components/ui.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Icon } from '../components/Icon.jsx';
import { Receipt } from './POS.jsx';
import { buildSalesReport } from '../pdfReport.js';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Sales() {
  const { toast, confirm } = useUI();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ orders: 0, revenue: 0 });
  const [open, setOpen] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [range, setRange] = useState('7'); // days for the PDF report; 'all' = every sale loaded (up to 5,000)
  const [pdfBusy, setPdfBusy] = useState(false);

  const loadSummary = () => api('/orders/summary').then(setSummary).catch(() => {});
  useEffect(() => { api('/orders').then(setOrders).catch((e) => toast(e.message, 'error')); loadSummary(); }, []);

  const refund = async (order) => {
    const ok = await confirm({
      title: `Refund ${order.receiptNo}?`, message: `${money(order.total)} will be refunded and the items go back into stock.`,
      confirmLabel: 'Refund', danger: true,
    });
    if (!ok) return;
    try {
      const updated = await api(`/orders/${order._id}/refund`, { method: 'POST' });
      setOrders((os) => os.map((o) => (o._id === updated._id ? updated : o)));
      setOpen(updated);
      loadSummary();
      toast(`${order.receiptNo} refunded`);
    } catch (e) { toast(e.message, 'error'); }
  };

  // Download every sale (up to 5,000 most recent) as a CSV file that opens in Excel / Google Sheets
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await api('/orders?limit=5000');
      const header = ['Receipt', 'Date', 'Cashier', 'Customer', 'Payment', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Profit', 'Status'];
      const rows = all.map((o) => [
        o.receiptNo, new Date(o.createdAt).toLocaleString(), o.cashier?.name, o.customer?.name, o.paymentMethod,
        o.items.map((i) => `${i.qty} x ${i.name}`).join('; '), o.subtotal, o.discount, o.tax, o.total, o.profit,
        o.status === 'refunded' ? 'Refunded' : 'Paid',
      ]);
      const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `retailx-sales-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast(`Exported ${all.length} ${all.length === 1 ? 'sale' : 'sales'}`);
    } catch (e) { toast(e.message, 'error'); }
    setExporting(false);
  };

  // PDF report for the chosen period: summary, top products, payment split and every order
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const all = await api('/orders?limit=5000');
      const since = range === 'all' ? 0 : Date.now() - Number(range) * 86400000;
      const list = all.filter((o) => new Date(o.createdAt).getTime() >= since);
      const doc = await buildSalesReport(list, range === 'all' ? 'All sales' : `Last ${range} days`);
      doc.save(`retailx-sales-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast(`PDF report ready (${list.length} ${list.length === 1 ? 'sale' : 'sales'})`);
    } catch (e) { toast(e.message, 'error'); }
    setPdfBusy(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <PageHeader title="Sales" subtitle="Your latest transactions. Click a row to view the receipt or refund it.">
        <select className="!py-1.5" aria-label="Report period" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All sales</option>
        </select>
        <button className="btn btn-primary" onClick={downloadPdf} disabled={pdfBusy}>
          <Icon name="download" className="h-4 w-4" />{pdfBusy ? 'Preparing…' : 'Download PDF report'}
        </button>
        <button className="btn" onClick={exportCsv} disabled={exporting}>
          <Icon name="download" className="h-4 w-4" />{exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-sm font-medium text-ink/60">Orders today</div>
          <div className="mt-1 text-3xl font-bold">{summary.orders}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-ink/60">Revenue today</div>
          <div className="grad-text mt-1 text-3xl font-bold">{money(summary.revenue)}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Receipt</th><th>Date</th><th>Cashier</th><th>Customer</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="clickable" tabIndex={0} onClick={() => setOpen(o)} onKeyDown={(e) => e.key === 'Enter' && setOpen(o)}>
                  <td className="font-semibold text-primary">{o.receiptNo}</td>
                  <td className="whitespace-nowrap text-ink/60">{new Date(o.createdAt).toLocaleString()}</td>
                  <td>{o.cashier?.name}</td>
                  <td className="text-ink/60">{o.customer?.name || 'Walk-in'}</td>
                  <td className="capitalize">{o.paymentMethod}</td>
                  <td className={`font-semibold ${o.status === 'refunded' ? 'text-ink/45 line-through' : ''}`}>{money(o.total)}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${o.status === 'refunded' ? 'bg-void/15 text-void' : 'bg-pay/10 text-pay'}`}>
                      {o.status === 'refunded' ? 'Refunded' : 'Paid'}
                    </span>
                  </td>
                </tr>
              ))}
              {!orders.length && <tr><td className="p-6 text-center text-ink/45" colSpan="7">No sales yet. Completed sales show up here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {open && <Receipt order={open} closeLabel="Close" onClose={() => setOpen(null)} onRefund={open.status === 'refunded' ? undefined : () => refund(open)} />}
    </div>
  );
}
