import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.js';
import { Icon } from './Icon.jsx';
import Logo from './Logo.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', admin: true },
  { to: '/pos', label: 'Register', icon: 'register' },
  { to: '/inventory', label: 'Inventory', icon: 'box', admin: true },
  { to: '/sales', label: 'Sales', icon: 'receipt', admin: true },
  { to: '/customers', label: 'Customers', icon: 'user' },
  { to: '/expenses', label: 'Expenses', icon: 'wallet', admin: true },
  { to: '/users', label: 'Users', icon: 'users', admin: true },
  { to: '/activity', label: 'Activity', icon: 'activity', admin: true },
];
const IDLE_MS = 30 * 60 * 1000; // sign out after 30 minutes without activity
const TITLES = { '/dashboard': 'Dashboard', '/pos': 'Register', '/inventory': 'Inventory', '/sales': 'Sales', '/customers': 'Customers', '/expenses': 'Expenses', '/activity': 'Activity', '/users': 'Users', '/account': 'Account' };

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = user.role === 'admin';
  const [hidden, setHidden] = useState(() => localStorage.getItem('sidebar-hidden') === '1'); // desktop: fully hidden
  const [open, setOpen] = useState(false); // mobile: drawer open

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => localStorage.setItem('sidebar-hidden', hidden ? '1' : '0'), [hidden]);
  // Idle sign-out: protects a till that is left unattended
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem('flash', 'You were signed out after 30 minutes of inactivity.');
        logoutRef.current();
      }, IDLE_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, []);

  useEffect(() => { document.title = `${TITLES[pathname] || 'retailX'} · retailX`; }, [pathname]);

  // One menu button for every screen size: toggles the sidebar on desktop, the drawer on phones
  const toggle = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setHidden((h) => !h);
    else setOpen((o) => !o);
  };
  const closeDrawer = () => setOpen(false);

  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`;

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-bg">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden print:hidden" onClick={closeDrawer} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-hidden bg-ink text-white transition-all duration-200 print:hidden lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${hidden ? 'lg:w-0' : 'lg:w-64'}`}>
        <div className="flex h-full w-64 flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <Logo tone="dark" />
            <button className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" onClick={() => { closeDrawer(); setHidden(true); }} aria-label="Close menu">
              <Icon name="x" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
            {NAV.filter((i) => !i.admin || isAdmin).map((i) => (
              <NavLink key={i.to} to={i.to} className={link} onClick={closeDrawer}>
                <Icon name={i.icon} className="h-5 w-5 shrink-0" />{i.label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-1 border-t border-white/10 p-3">
            <NavLink to="/account" className={link} onClick={closeDrawer}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
                {user.name.trim()[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate">{user.name}</span>
                <span className="block text-[11px] font-medium capitalize opacity-70">{user.role}</span>
              </span>
            </NavLink>
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
              <Icon name="logout" className="h-5 w-5 shrink-0" />Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-ink/10 bg-card print:hidden">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-1.5 text-ink/70 hover:bg-ink/10" onClick={toggle} aria-label="Toggle menu">
                <Icon name="menu" />
              </button>
              <span className="hidden text-sm font-medium text-ink/60 sm:inline">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <NavLink to="/account" className="flex items-center gap-2 rounded-full border border-ink/10 py-1 pl-1 pr-3 text-sm font-semibold text-ink/80 hover:bg-ink/5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">{user.name.trim()[0]?.toUpperCase()}</span>
              <span className="hidden sm:inline">{user.name}</span>
            </NavLink>
          </div>
        </header>
        {user.mustChangePassword && pathname !== '/account' && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-accent/40 bg-accent/15 px-4 py-2 text-sm print:hidden lg:px-6" role="alert">
            <span className="flex items-center gap-2 font-medium">
              <Icon name="alert" className="h-4 w-4 text-primary" />
              You are using a default or temporary password. Please change it to secure your account.
            </span>
            <NavLink to="/account" className="btn btn-primary btn-sm">Change password</NavLink>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}