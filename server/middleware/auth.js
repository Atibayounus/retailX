import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const protect = wrap(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Please sign in' });
  try {
    const { id, iat } = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(id);
    if (!user || user.active === false) return res.status(401).json({ message: 'Account is disabled or no longer exists' });
    // Tokens issued before the last password change are no longer valid
    if (user.passwordChangedAt && iat < Math.floor(user.passwordChangedAt.getTime() / 1000))
      return res.status(401).json({ message: 'Password was changed, sign in again' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, sign in again' });
  }
});

export const adminOnly = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only' });
