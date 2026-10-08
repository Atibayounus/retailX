import ActivityLog from '../models/ActivityLog.js';

// Records who did what. Never blocks or breaks the request it is called from.
export function logActivity(user, action, detail = '') {
  ActivityLog.create({
    user: user?._id || null,
    userName: user?.name || user?.email || 'Unknown',
    action,
    detail: String(detail).slice(0, 300),
  }).catch((e) => console.error('Activity log failed:', e.message));
}