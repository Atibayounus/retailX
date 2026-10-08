import { BRAND, CURRENCY } from './api.js';

const fmt = (n) => `${CURRENCY} ${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const YELLOW = [255, 214, 10];
const INK = [10, 10, 10];

// Builds a sales report PDF from a list of orders. jsPDF is loaded on demand so it stays out of the main bundle.
export async function buildSalesReport(orders, label) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  const paid = orders.filter((o) => o.status !== 'refunded');
  const refunded = orders.length - paid.length;
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const profit = paid.reduce((s, o) => s + (o.profit || 0), 0);

  const byPay = {};
  const byProduct = {};
  for (const o of paid) {
    byPay[o.paymentMethod] = (byPay[o.paymentMethod] || 0) + o.total;
    for (const i of o.items) {
      const p = (byProduct[i.name] ||= { qty: 0, revenue: 0 });
      p.qty += i.qty; p.revenue += i.price * i.qty;
    }
  }
  const top = Object.entries(byProduct).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header band in the retailX black and yellow
  doc.setFillColor(...INK); doc.rect(0, 0, W, 78, 'F');
  doc.setFillColor(...YELLOW); doc.rect(0, 78, W, 4, 'F');
  doc.setTextColor(...YELLOW); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  doc.text(BRAND, 40, 45);
  doc.setTextColor(255, 251, 234); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('Sales report', 40, 63);
  doc.text(`${label}  |  Generated ${new Date().toLocaleString()}`, W - 40, 63, { align: 'right' });

  // Summary
  doc.setTextColor(...INK);
  autoTable(doc, {
    startY: 100, theme: 'grid', styles: { fontSize: 10, cellPadding: 7 },
    headStyles: { fillColor: INK, textColor: YELLOW },
    head: [['Revenue', 'Profit', 'Orders', 'Average order', 'Refunded']],
    body: [[fmt(revenue), fmt(profit), String(paid.length), fmt(paid.length ? revenue / paid.length : 0), String(refunded)]],
  });

  const half = (W - 80 - 20) / 2;
  const y = doc.lastAutoTable.finalY + 18;
  autoTable(doc, {
    startY: y, margin: { left: 40, right: 40 + half + 20 }, styles: { fontSize: 9 }, headStyles: { fillColor: INK, textColor: YELLOW },
    head: [['Top products', 'Sold', 'Revenue']],
    body: top.length ? top.map(([n, p]) => [n, p.qty, fmt(p.revenue)]) : [['No sales', '', '']],
  });
  const afterTop = doc.lastAutoTable.finalY;
  autoTable(doc, {
    startY: y, margin: { left: 40 + half + 20, right: 40 }, styles: { fontSize: 9 }, headStyles: { fillColor: INK, textColor: YELLOW },
    head: [['Payment', 'Total']],
    body: Object.keys(byPay).length ? Object.entries(byPay).map(([m, t]) => [m[0].toUpperCase() + m.slice(1), fmt(t)]) : [['No sales', '']],
  });

  // All orders
  autoTable(doc, {
    startY: Math.max(afterTop, doc.lastAutoTable.finalY) + 22, styles: { fontSize: 8 }, headStyles: { fillColor: INK, textColor: YELLOW },
    alternateRowStyles: { fillColor: [250, 248, 235] },
    head: [['Receipt', 'Date', 'Cashier', 'Customer', 'Payment', 'Total', 'Status']],
    body: orders.map((o) => [
      o.receiptNo, new Date(o.createdAt).toLocaleString(), o.cashier?.name || '', o.customer?.name || 'Walk-in',
      o.paymentMethod, fmt(o.total), o.status === 'refunded' ? 'Refunded' : 'Paid',
    ]),
    didDrawPage: () => {
      const n = doc.internal.getNumberOfPages();
      doc.setFontSize(8); doc.setTextColor(120);
      doc.text(`${BRAND} sales report  |  page ${n}`, W / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    },
  });
  return doc;
}
