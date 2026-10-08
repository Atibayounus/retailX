import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import Order from './models/Order.js';
import Product from './models/Product.js';

if (process.env.USE_GOOGLE_DNS === 'true') dns.setServers(['8.8.8.8', '8.8.4.4']);

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.log(`This permanently deletes ALL orders (sales history), so revenue, orders and the graph go back to 0.
Run again with --yes to confirm:   npm run reset-sales -- --yes
Optional: add --restock to also put the sold items back into stock.`);
  process.exit(0);
}

await mongoose.connect(process.env.MONGO_URI);
if (args.includes('--restock')) {
  const orders = await Order.find({ status: { $ne: 'refunded' } });
  for (const o of orders)
    for (const i of o.items) await Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } });
  console.log('Sold items put back into stock.');
}
const r = await Order.deleteMany({});
console.log(`Deleted ${r.deletedCount} orders. Sales are now 0.`);
await mongoose.disconnect();
