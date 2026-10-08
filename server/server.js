import 'dotenv/config';
import dns from 'dns';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import { rateLimit } from './middleware/rateLimit.js';

if (process.env.USE_GOOGLE_DNS === 'true') dns.setServers(['8.8.8.8', '8.8.4.4']);

// The JWT secret signs every login token: refuse to run without one, and complain if it is weak
const secret = process.env.JWT_SECRET || '';
if (!secret) { console.error('JWT_SECRET is missing. Add it to server/.env'); process.exit(1); }
if (secret.length < 32 || secret.startsWith('change-this')) {
  const msg = `JWT_SECRET is weak or still the example value. Generate a strong one with:
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`;
  if (process.env.NODE_ENV === 'production') { console.error(msg); process.exit(1); }
  console.warn('\nWARNING: ' + msg + '\n');
}

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Cache-Control': 'no-store',
  });
  if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));

app.get('/api/config', (req, res) => res.json({ taxRate: Number(process.env.TAX_RATE) || 0 }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Clients get clear messages for bad input, never stack traces or database internals
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;
  if (err.name === 'CastError') { status = 400; message = 'Invalid value or id'; }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join('. '); }
  else if (err.code === 11000) { status = 409; message = 'That value already exists'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request too large'; }
  if (status >= 500) { console.error(err); message = 'Server error'; }
  res.status(status).json({ message });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('API running on port ' + (process.env.PORT || 5000))))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
