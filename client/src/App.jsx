import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api.js';
import { AuthCtx } from './auth.js';
import { UIProvider } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import POS from './pages/POS.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import Customers from './pages/Customers.jsx';
import Users from './pages/Users.jsx';
import Account from './pages/Account.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api('/auth/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, []);

  if (!ready) return null;

  const isAdmin = user?.role === 'admin';
  const adminOnly = (el) => (isAdmin ? el : <Navigate to="/pos" replace />);

  return (
    <UIProvider>
      <AuthCtx.Provider value={{ user, setUser, logout }}>
        <Routes>
          {/* Known pages: signed-out visitors see the login screen, everyone else gets the dashboard layout */}
          <Route element={user ? <Layout /> : <Login onLogin={setUser} />}>
            <Route index element={<Navigate to={isAdmin ? '/dashboard' : '/pos'} replace />} />
            <Route path="dashboard" element={adminOnly(<Dashboard />)} />
            <Route path="pos" element={<POS />} />
            <Route path="inventory" element={adminOnly(<Inventory />)} />
            <Route path="sales" element={adminOnly(<Sales />)} />
            <Route path="customers" element={<Customers />} />
            <Route path="users" element={adminOnly(<Users />)} />
            <Route path="account" element={<Account />} />
            <Route path="reports" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthCtx.Provider>
    </UIProvider>
  );
}
