export const BRAND = 'retailX';
export const CURRENCY = 'PKR'; // change to USD, EUR, etc.

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && path !== '/auth/login') {
    // Expired, revoked or disabled session: clear it and send the user to the sign-in screen
    localStorage.removeItem('token');
    sessionStorage.setItem('flash', 'Your session ended. Please sign in again.');
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const money = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(n || 0);

export const compact = (n) =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
