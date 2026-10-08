import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

// Toasts + confirm/prompt dialogs, replacing the browser's alert/confirm/prompt
export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const counter = useRef(0);

  const toast = useCallback((message, type = 'success') => {
    const key = ++counter.current;
    setToasts((t) => [...t, { key, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), 4000);
  }, []);

  const ask = useCallback((kind, opts) =>
    new Promise((resolve) => setDialog({ id: ++counter.current, kind, ...opts, resolve })), []);
  const confirm = useCallback((opts) => ask('confirm', opts), [ask]);
  const prompt = useCallback((opts) => ask('prompt', opts), [ask]);

  const close = (value) => { dialog.resolve(value); setDialog(null); };

  return (
    <UICtx.Provider value={{ toast, confirm, prompt }}>
      {children}
      <div className="fixed top-4 right-4 z-[70] space-y-2 print:hidden" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.key} className={`toast-in flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${t.type === 'error' ? 'bg-void text-white' : t.type === 'info' ? 'bg-ink text-white' : 'bg-pay text-white'}`}>
            <Icon name={t.type === 'error' ? 'alert' : 'check'} className="w-4 h-4" />
            {t.message}
          </div>
        ))}
      </div>
      {dialog && <Dialog key={dialog.id} dialog={dialog} close={close} />}
    </UICtx.Provider>
  );
}

function Dialog({ dialog, close }) {
  const isPrompt = dialog.kind === 'prompt';
  const [value, setValue] = useState('');
  const focusRef = useRef(null);
  const cancel = () => close(isPrompt ? null : false);

  useEffect(() => {
    focusRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e) => { e.preventDefault(); close(isPrompt ? value : true); };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 print:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="card w-full max-w-sm p-6 shadow-2xl">
        <h2 id="dlg-title" className="text-lg font-bold">{dialog.title}</h2>
        {dialog.message && <p className="text-sm text-ink/60 mt-1.5">{dialog.message}</p>}
        {isPrompt && (
          <input ref={focusRef} className="w-full mt-4" required type={dialog.type || 'text'} minLength={dialog.minLength}
            placeholder={dialog.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={cancel}>Cancel</button>
          <button ref={isPrompt ? undefined : focusRef} className={`btn ${dialog.danger ? 'btn-danger-solid' : 'btn-primary'}`}>
            {dialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}
