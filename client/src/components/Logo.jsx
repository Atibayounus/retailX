// tone="default": on light backgrounds. tone="dark": on the dark sidebar. tone="onPrimary": on the brown primary colour.
export default function Logo({ tone = 'default', textClass = '', className = '' }) {
  const onPrimary = tone === 'onPrimary';
  const dark = tone === 'dark';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`grid place-items-center w-9 h-9 rounded-xl shrink-0 ${onPrimary ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
      <span className={`text-xl tracking-tight font-semibold ${textClass} ${onPrimary || dark ? 'text-white' : 'text-ink'}`}>
        retail<span className={`font-extrabold ${onPrimary ? 'text-amber-200' : dark ? 'text-accent' : 'text-primary'}`}>X</span>
      </span>
    </span>
  );
}
