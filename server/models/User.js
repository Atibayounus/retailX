import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'cashier'], default: 'cashier' },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false }, // default or admin-set temporary password
    passwordChangedAt: { type: Date },                     // older sign-ins stop working after this
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
