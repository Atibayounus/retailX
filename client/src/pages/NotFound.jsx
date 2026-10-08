import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { Icon } from '../components/Icon.jsx';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="grad-brand px-6 py-4">
        <Logo tone="onPrimary" />
      </header>
      <main className="grid flex-1 place-items-center px-6 py-12">
        <div className="max-w-md text-center">
          <div className="relative mx-auto mb-6 grid h-28 w-28 place-items-center rounded-3xl bg-primary/10 text-primary">
            <Icon name="cart" className="h-14 w-14" />
            <span className="grad-brand absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full text-lg font-bold">?</span>
          </div>
          <p className="grad-text text-8xl font-extrabold tracking-tight">404</p>
          <h1 className="mt-2 text-2xl font-bold">This aisle is empty</h1>
          <p className="mt-2 text-ink/60">
            The page you're looking for doesn't exist or has been moved. Let's get you back to the register.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-primary !px-6 !py-3">Back to retailX</Link>
            <button className="btn !px-6 !py-3" onClick={() => navigate(-1)}>Go back</button>
          </div>
        </div>
      </main>
    </div>
  );
}
