import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: String,
  action: { type: String, index: true },
  detail: String,
  createdAt: { type: Date, default: Date.now },
});

// Entries are kept for 180 days, then removed automatically
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export default mongoose.model('ActivityLog', activitySchema);