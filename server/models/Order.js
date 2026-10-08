import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, unique: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        cost: { type: Number, default: 0 },
        qty: Number,
      },
    ],
    subtotal: Number,
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: Number,
    profit: { type: Number, default: 0 },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    paymentMethod: { type: String, enum: ['cash', 'card', 'wallet'], default: 'cash' },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['completed', 'refunded'], default: 'completed' },
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
