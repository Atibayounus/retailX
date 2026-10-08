import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';

if (process.env.USE_GOOGLE_DNS === 'true') dns.setServers(['8.8.8.8', '8.8.4.4']);

await mongoose.connect(process.env.MONGO_URI);
if (!(await User.findOne({ email: 'admin@pos.local' })))
  await User.create({ name: 'Admin', email: 'admin@pos.local', role: 'admin', mustChangePassword: true, password: await bcrypt.hash('admin123', 12) });

if (!(await Product.countDocuments()))
  await Product.insertMany([
    { name: 'Espresso', sku: 'DRK-001', category: 'Drinks', price: 250, costPrice: 90, stock: 100 },
    { name: 'Cold Brew', sku: 'DRK-002', category: 'Drinks', price: 350, costPrice: 140, stock: 60 },
    { name: 'Masala Chai', sku: 'DRK-003', category: 'Drinks', price: 150, costPrice: 50, stock: 120 },
    { name: 'Chicken Roll', sku: 'FOD-001', category: 'Food', price: 400, costPrice: 220, stock: 40 },
    { name: 'Club Sandwich', sku: 'FOD-002', category: 'Food', price: 550, costPrice: 310, stock: 30 },
    { name: 'Brownie', sku: 'SWT-001', category: 'Sweets', price: 300, costPrice: 120, stock: 25 },
  ]);

if (!(await Customer.countDocuments()))
  await Customer.insertMany([
    { name: 'Ayesha Khan', phone: '0300-1234567', email: 'ayesha@example.com' },
    { name: 'Bilal Ahmed', phone: '0321-7654321' },
  ]);

console.log('Seeded. Login: admin@pos.local / admin123 (change it after first login)');
await mongoose.disconnect();
