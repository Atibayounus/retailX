import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, adminOnly, wrap } from '../middleware/auth.js';
import { loginGuard } from '../middleware/rateLimit.js';
import { logActivity } from '../utils/activity.js';

const router = Router();
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt ignores anything beyond 72 bytes
const COST = 12;
const DEFAULT_PASSWORD = 'admin123'; // the seeded admin password: flagged so the user is told to change it
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '12h', algorithm: 'HS256' });
const publicUser = (u) => ({
  _id: u._id, name: u.name, email: u.email, role: u.role,
  active: u.active !== false, mustChangePassword: !!u.mustChangePassword,
});
const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const str = (v) => (typeof v === 'string' ? v : '');
const emailOk = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(e);
const checkPassword = (p) => {
  if (p.length < MIN_PASSWORD) throw bad(`Password must be at least ${MIN_PASSWORD} characters`);
  if (p.length > MAX_PASSWORD) throw bad(`Password must be ${MAX_PASSWORD} characters or fewer`);
};
const lockedMessage = (secs) => `Too many failed attempts. Try again in ${Math.ceil(secs / 60)} minute(s).`;

router.post('/login', wrap(async (req, res) => {
  const email = str(req.body.email).trim().toLowerCase();
  const password = str(req.body.password);
  const key = `login|${req.ip}|${email}`;

  const wait = loginGuard.blockedFor(key);
  if (wait) { res.set('Retry-After', String(wait)); return res.status(429).json({ message: lockedMessage(wait) }); }

  const user = email ? await User.findOne({ email }).select('+password') : null;
  // Always run one bcrypt comparison so timing doesn't reveal whether an email exists
  const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || !ok) {
    loginGuard.fail(key);
    logActivity({ name: email || 'unknown' }, 'login_failed', `Failed sign-in for ${email || 'no email'} from ${req.ip}`);
    return res.status(401).json({ message: 'Wrong email or password' });
  }
  if (user.active === false) return res.status(403).json({ message: 'This account is disabled. Ask an admin.' });

  loginGuard.clear(key);
  if (password === DEFAULT_PASSWORD && !user.mustChangePassword) {
    await User.updateOne({ _id: user._id }, { mustChangePassword: true });
    user.mustChangePassword = true;
  }
  logActivity(user, 'login', `Signed in from ${req.ip}`);
  res.json({ token: sign(user), user: publicUser(user) });
}));

router.get('/me', protect, (req, res) => res.json(publicUser(req.user)));

// Change own password: signs out every other session and returns a fresh token for this one
router.post('/password', protect, wrap(async (req, res) => {
  const currentPassword = str(req.body.currentPassword);
  const newPassword = str(req.body.newPassword);
  const key = `pw|${req.user._id}`;
  const wait = loginGuard.blockedFor(key);
  if (wait) { res.set('Retry-After', String(wait)); return res.status(429).json({ message: lockedMessage(wait) }); }

  checkPassword(newPassword);
  if (newPassword === currentPassword) throw bad('New password must be different from the current one');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    loginGuard.fail(key);
    throw bad('Current password is wrong');
  }
  loginGuard.clear(key);
  user.password = await bcrypt.hash(newPassword, COST);
  user.passwordChangedAt = new Date();
  user.mustChangePassword = false;
  await user.save();
  logActivity(req.user, 'password_changed', 'Changed own password');
  res.json({ ok: true, token: sign(user), user: publicUser(user) });
}));

// ---- Admin: user management ----
router.get('/users', protect, adminOnly, wrap(async (req, res) => {
  res.json((await User.find().sort({ createdAt: 1 })).map(publicUser));
}));

router.post('/register', protect, adminOnly, wrap(async (req, res) => {
  const name = str(req.body.name).trim();
  const email = str(req.body.email).trim().toLowerCase();
  const password = str(req.body.password);
  const role = req.body.role === 'admin' ? 'admin' : 'cashier';
  if (!name || !email || !password) throw bad('Name, email and password are required');
  if (name.length > 80) throw bad('Name is too long');
  if (!emailOk(email)) throw bad('Enter a valid email address');
  checkPassword(password);
  if (await User.findOne({ email })) throw bad('Email already in use', 409);
  // The admin knows this password, so the new user is asked to change it
  const user = await User.create({ name, email, role, mustChangePassword: true, password: await bcrypt.hash(password, COST) });
  logActivity(req.user, 'user_created', `Added ${user.email} as ${user.role}`);
  res.status(201).json(publicUser(user));
}));

router.put('/users/:id', protect, adminOnly, wrap(async (req, res) => {
  const { role, active } = req.body;
  const self = String(req.params.id) === String(req.user._id);
  if (self && (active === false || (role && role !== 'admin'))) throw bad('You cannot disable or demote your own account');
  const update = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) update.name = req.body.name.trim().slice(0, 80);
  if (role !== undefined) {
    if (!['admin', 'cashier'].includes(role)) throw bad('Invalid role');
    update.role = role;
  }
  if (typeof active === 'boolean') update.active = active;
  if (req.body.password !== undefined) {
    const password = str(req.body.password);
    checkPassword(password);
    update.password = await bcrypt.hash(password, COST);
    update.passwordChangedAt = new Date(); // signs that user out everywhere
    update.mustChangePassword = true;
  }
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!user) throw bad('User not found', 404);
  const changes = [role !== undefined && `role: ${role}`, typeof active === 'boolean' && (active ? 'enabled' : 'disabled'), req.body.password !== undefined && 'password reset', update.name && 'renamed'].filter(Boolean);
  logActivity(req.user, 'user_updated', `${user.email}: ${changes.join(', ') || 'updated'}`);
  res.json(publicUser(user));
}));

export default router;