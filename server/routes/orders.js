import { Router } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Expense from '../models/Expense.js';
import { logActivity } from '../utils/activity.js';
import { protect, adminOnly, wrap } from '../middleware/auth.js';

const router = Router();
router.use(protect);

// Checkout: prices and totals are computed on the server, never trusted from the client
router.post('/', wrap(async (req, res) => {
  const { items = [], discount = 0, paymentMethod = 'cash', customer = null } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Cart is empty' });
  if (items.length > 200) return res.status(400).json({ message: 'Too many items in one sale' });
  if (!['cash', 'card', 'wallet'].includes(paymentMethod)) return res.status(400).json({ message: 'Invalid payment method' });

  if (customer && !(await Customer.exists({ _id: customer }))) return res.status(400).json({ message: 'Customer not found' });

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
  const lines = items.map((i) => {
    const p = products.find((x) => String(x._id) === String(i.product));
    const qty = Math.floor(Number(i.qty));
    if (!p || !(qty > 0 && qty <= 10000)) throw Object.assign(new Error('Invalid item in cart'), { status: 400 });
    return { product: p._id, name: p.name, price: p.price, cost: p.costPrice || 0, qty };
  });

  // Reserve stock atomically; undo if any line is short
  const taken = [];
  try {
    for (const l of lines) {
      const r = await Product.updateOne({ _id: l.product, stock: { $gte: l.qty } }, { $inc: { stock: -l.qty } });
      if (!r.modifiedCount) throw Object.assign(new Error(`Not enough stock for ${l.name}`), { status: 409 });
      taken.push(l);
    }
  } catch (err) {
    await Promise.all(taken.map((l) => Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } })));
    throw err;
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = Math.round((subtotal - disc) * (Number(process.env.TAX_RATE) || 0) * 100) / 100;
  const order = await Order.create({
    receiptNo: 'R' + Date.now().toString(36).toUpperCase(),
    items: lines, subtotal, discount: disc, tax,
    total: subtotal - disc + tax,
    profit: Math.round((lines.reduce((s, l) => s + (l.price - l.cost) * l.qty, 0) - disc) * 100) / 100,
    paymentMethod, cashier: req.user._id, customer: customer || null,
  });
  res.status(201).json(await order.populate([{ path: 'cashier', select: 'name' }, { path: 'customer', select: 'name' }]));
}));

// Latest orders (default 100). ?limit= up to 5000 is used by the CSV export
router.get('/', adminOnly, wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 5000);
  res.json(await Order.find().sort({ createdAt: -1 }).limit(limit).populate('cashier', 'name').populate('customer', 'name'));
}));

router.get('/summary', adminOnly, wrap(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [row] = await Order.aggregate([
    { $match: { createdAt: { $gte: start }, status: { $ne: 'refunded' } } },
    { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
  ]);
  res.json({ orders: row?.orders || 0, revenue: row?.revenue || 0 });
}));

// Dashboard: daily sales series for the last 7/30/90 days, KPIs vs the previous period,
// top products, payment split, recent orders and low-stock products (refunds excluded from revenue)
router.get('/dashboard', adminOnly, wrap(async (req, res) => {
  const DAY = 86400000;
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
  const tz = process.env.REPORT_TIMEZONE || 'UTC';
  const now = Date.now();
  const dayKey = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: tz });
  const dayExpr = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } };
  const keys = Array.from({ length: days * 2 }, (_, i) => dayKey(now - (days * 2 - 1 - i) * DAY));
  const startKey = keys[days]; // first day of the current period

  // createdAt pre-filter uses a 1-day margin; the exact day boundary is applied with $expr in the shop's timezone
  const currentMatch = { createdAt: { $gte: new Date(now - (days + 1) * DAY) }, status: { $ne: 'refunded' }, $expr: { $gte: [dayExpr, startKey] } };

  // Low stock = at or below each product's own reorder level (5 for products created before that field existed)
  const lowStockFilter = { $expr: { $lte: ['$stock', { $ifNull: ['$reorderLevel', 5] }] } };

  const [daily, top, payments, recent, lowStock, lowStockCount, expenseRows] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: new Date(now - (days * 2 + 1) * DAY) }, status: { $ne: 'refunded' } } },
      { $group: { _id: dayExpr, revenue: { $sum: '$total' }, profit: { $sum: '$profit' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: currentMatch }, { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { qty: -1 } }, { $limit: 5 },
    ]),
    Order.aggregate([{ $match: currentMatch }, { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Order.find().sort({ createdAt: -1 }).limit(6).populate('cashier', 'name').populate('customer', 'name'),
    Product.find(lowStockFilter).sort({ stock: 1, name: 1 }).limit(8).select('name category stock reorderLevel'),
    Product.countDocuments(lowStockFilter),
    // Expenses are stored by shop day (YYYY-MM-DD), so the same day keys split current and previous period
    Expense.aggregate([
      { $match: { date: { $gte: keys[0] } } },
      { $group: { _id: { $cond: [{ $gte: ['$date', startKey] }, 'cur', 'prev'] }, total: { $sum: '$amount' } } },
    ]),
  ]);
  const expOf = (k) => expenseRows.find((r) => r._id === k)?.total || 0;

  const round = (n) => Math.round(n * 100) / 100;
  const byDay = Object.fromEntries(daily.map((d) => [d._id, d]));
  const series = keys.map((date) => ({ date, revenue: round(byDay[date]?.revenue || 0), profit: round(byDay[date]?.profit || 0), orders: byDay[date]?.orders || 0 }));
  const prev = series.slice(0, days);
  const cur = series.slice(days);
  const sum = (arr, k) => arr.reduce((s, d) => s + d[k], 0);

  res.json({
    days: cur,
    totals: {
      revenue: round(sum(cur, 'revenue')), orders: sum(cur, 'orders'), profit: round(sum(cur, 'profit')),
      prevRevenue: round(sum(prev, 'revenue')), prevOrders: sum(prev, 'orders'), prevProfit: round(sum(prev, 'profit')),
      expenses: round(expOf('cur')), prevExpenses: round(expOf('prev')),
    },
    today: cur[cur.length - 1],
    top, payments, recent, lowStock, lowStockCount,
  });
}));

// Refund: atomically mark refunded (so it can't happen twice), then put stock back
router.post('/:id/refund', adminOnly, wrap(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: { $ne: 'refunded' } },
    { status: 'refunded', refundedAt: new Date(), refundedBy: req.user._id },
    { new: true }
  );
  if (!order) return res.status(400).json({ message: 'Order not found or already refunded' });
  await Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));
  logActivity(req.user, 'refund', `${order.receiptNo} refunded (${order.total})`);
  res.json(await order.populate([{ path: 'cashier', select: 'name' }, { path: 'customer', select: 'name' }]));
}));

// Last 7 days: revenue per day, top products, payment split (refunds excluded)
router.get('/report', adminOnly, wrap(async (req, res) => {
  const DAYS = 7, DAY = 86400000;
  const tz = process.env.REPORT_TIMEZONE || 'UTC';
  const dayKey = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: tz });
  const match = { createdAt: { $gte: new Date(Date.now() - DAYS * DAY) }, status: { $ne: 'refunded' } };

  const [daily, top, payments] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: match }, { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { qty: -1 } }, { $limit: 5 },
    ]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, orders: { $sum: 1 } } }]),
  ]);

  const byDay = Object.fromEntries(daily.map((d) => [d._id, d]));
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = dayKey(Date.now() - (DAYS - 1 - i) * DAY);
    return { date, revenue: byDay[date]?.revenue || 0, orders: byDay[date]?.orders || 0 };
  });
  res.json({ days, top, payments });
}));

export default router;