import { Router } from 'express';
import ActivityLog from '../models/ActivityLog.js';
import { protect, adminOnly, wrap } from '../middleware/auth.js';

const router = Router();
router.use(protect, adminOnly);

// Latest activity first. ?limit= up to 500, ?action= to filter one type
router.get('/', wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
  const filter = typeof req.query.action === 'string' && /^[a-z_]{1,40}$/.test(req.query.action) ? { action: req.query.action } : {};
  res.json(await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit));
}));

export default router;