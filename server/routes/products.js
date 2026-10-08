import { Router } from 'express';
import Product from '../models/Product.js';
import { protect, adminOnly, wrap } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const bad = (message) => Object.assign(new Error(message), { status: 400 });

// Only these fields can be written, and they are validated before they reach the database
function clean(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) throw bad('Product name is required (max 120 characters)');
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) throw bad('Price must be 0 or more');
  const costPrice = Number(body.costPrice ?? 0);
  if (!Number.isFinite(costPrice) || costPrice < 0) throw bad('Cost price must be 0 or more');
  const reorderLevel = Number(body.reorderLevel ?? 5);
  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) throw bad('Reorder level must be a whole number, 0 or more');
  const stock = Number(body.stock ?? 0);
  if (!Number.isInteger(stock) || stock < 0) throw bad('Stock must be a whole number, 0 or more');
  const sku = typeof body.sku === 'string' ? body.sku.trim().slice(0, 64) : '';
  const category = (typeof body.category === 'string' && body.category.trim()) || 'General';
  return { name, price, costPrice, stock, reorderLevel, sku, category: category.slice(0, 60) };
}

router.get('/', wrap(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { sku: q }];
  if (category) filter.category = category;
  const query = Product.find(filter).sort({ name: 1 });
  if (req.user.role !== 'admin') query.select('-costPrice'); // cost and margin are for admins only
  res.json(await query);
}));

router.post('/', adminOnly, wrap(async (req, res) => {
  const { sku, ...rest } = clean(req.body);
  res.status(201).json(await Product.create({ ...rest, ...(sku ? { sku } : {}) }));
}));

router.put('/:id', adminOnly, wrap(async (req, res) => {
  const { sku, ...rest } = clean(req.body);
  const update = sku ? { $set: { ...rest, sku } } : { $set: rest, $unset: { sku: 1 } };
  const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}));

router.delete('/:id', adminOnly, wrap(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
