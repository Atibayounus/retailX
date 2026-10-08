import { Router } from 'express';
import Expense, { EXPENSE_CATEGORIES } from '../models/Expense.js';
import { protect, adminOnly, wrap } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router();
router.use(protect, adminOnly);

const bad = (message) => Object.assign(new Error(message), { status: 400 });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function clean(body) {
  const title = str(body.title, 120);
  if (!title) throw bad('Title is required (max 120 characters)');
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw bad('Amount must be more than 0');
  const category = EXPENSE_CATEGORIES.includes(body.category) ? body.category : 'Other';
  const date = str(body.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw bad('Enter a valid date');
  return { title, amount: Math.round(amount * 100) / 100, category, date, note: str(body.note, 300) };
}

// Newest first. ?from=YYYY-MM-DD limits the list (the page uses it for "this month" etc.)
router.get('/', wrap(async (req, res) => {
  const from = typeof req.query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : null;
  res.json(await Expense.find(from ? { date: { $gte: from } } : {}).sort({ date: -1, createdAt: -1 }).limit(1000));
}));

router.post('/', wrap(async (req, res) => {
  const data = clean(req.body);
  const expense = await Expense.create({ ...data, createdBy: req.user._id });
  logActivity(req.user, 'expense_added', `${data.title} (${data.category}) ${data.amount}`);
  res.status(201).json(expense);
}));

router.put('/:id', wrap(async (req, res) => {
  const data = clean(req.body);
  const expense = await Expense.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  logActivity(req.user, 'expense_updated', `${data.title} (${data.category}) ${data.amount}`);
  res.json(expense);
}));

router.delete('/:id', wrap(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (expense) logActivity(req.user, 'expense_deleted', `${expense.title} (${expense.category}) ${expense.amount}`);
  res.json({ ok: true });
}));

export default router;