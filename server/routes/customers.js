import { Router } from 'express';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { protect, adminOnly, wrap } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router();
router.use(protect);

const bad = (message) => Object.assign(new Error(message), { status: 400 });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Only these fields can be written, and they are validated before they reach the database
function clean(body) {
  const name = str(body.name, 120);
  if (!name) throw bad('Customer name is required (max 120 characters)');
  const email = str(body.email, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Enter a valid email address');
  return { name, phone: str(body.phone, 30), email, address: str(body.address, 200), notes: str(body.notes, 500) };
}

// Customers with their lifetime stats (refunded sales are not counted)
router.get('/', wrap(async (req, res) => {
  const [customers, stats] = await Promise.all([
    Customer.find().sort({ name: 1 }).lean(),
    Order.aggregate([
      { $match: { customer: { $ne: null }, status: { $ne: 'refunded' } } },
      { $group: { _id: '$customer', orders: { $sum: 1 }, spent: { $sum: '$total' }, last: { $max: '$createdAt' } } },
    ]),
  ]);
  const byId = Object.fromEntries(stats.map((s) => [String(s._id), s]));
  res.json(customers.map((c) => {
    const s = byId[String(c._id)];
    return { ...c, orders: s?.orders || 0, spent: Math.round((s?.spent || 0) * 100) / 100, lastPurchase: s?.last || null };
  }));
}));

// Purchase history for one customer, newest first
router.get('/:id/orders', wrap(async (req, res) => {
  res.json(
    await Order.find({ customer: req.params.id }).sort({ createdAt: -1 }).limit(200)
      .populate('cashier', 'name').populate('customer', 'name')
  );
}));

router.post('/', wrap(async (req, res) => {
  const { phone, ...rest } = clean(req.body);
  res.status(201).json(await Customer.create({ ...rest, ...(phone ? { phone } : {}) }));
}));

router.put('/:id', wrap(async (req, res) => {
  const { phone, ...rest } = clean(req.body);
  const update = phone ? { $set: { ...rest, phone } } : { $set: rest, $unset: { phone: 1 } };
  const customer = await Customer.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
}));

// Past receipts keep working: orders just lose the link to the deleted customer
router.delete('/:id', adminOnly, wrap(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (customer) logActivity(req.user, 'customer_deleted', customer.name);
  await Order.updateMany({ customer: req.params.id }, { $set: { customer: null } });
  res.json({ ok: true });
}));

export default router;