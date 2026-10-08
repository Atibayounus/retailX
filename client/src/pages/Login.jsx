import { useState } from 'react';
import { api } from '../api.js';

// Optional: put a photo in client/public/ (e.g. login.jpg) and set HERO_IMAGE = '/login.jpg'
// to show it instead of the illustration.
const HERO_IMAGE = '';

const css = `
.rx{display:grid;grid-template-columns:1fr;min-height:100vh;background:#0a0a0a;font-family:"Plus Jakarta Sans",system-ui,sans-serif}
@media (min-width:900px){.rx{grid-template-columns:minmax(400px,.9fr) 1.1fr}}
@keyframes rx-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes rx-spin{to{transform:rotate(360deg)}}
@keyframes rx-fl{50%{transform:translateY(-10px)}}

/* ---------- form side ---------- */
.rx-form{display:flex;flex-direction:column;color:#fffbea;background:#0a0a0a}
.rx-strip{height:8px;background:#ffd60a}
@media (min-width:900px){.rx-strip{display:none}}
.rx-form-in{flex:1;display:grid;place-items:center;padding:32px 24px}
.rx-box{width:100%;max-width:380px;animation:rx-in .5s cubic-bezier(.2,.7,.2,1) both}
.rx-brand{display:flex;align-items:center;gap:12px}
.rx-mark{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#0a0a0a;background:#ffd60a}
.rx-mark svg{width:22px;height:22px}
.rx-name{font-size:24px;font-weight:600;letter-spacing:-.02em}
.rx-name b{font-weight:800;color:#ffd60a}
.rx-box h1{margin:38px 0 6px;font-size:36px;line-height:1.1;font-weight:800;letter-spacing:-.03em}
.rx-sub{margin:0 0 28px;font-size:15px;color:rgba(255,251,234,.62)}
.rx-label{display:block;margin-bottom:18px;font-size:13px;font-weight:600;color:rgba(255,251,234,.8)}
.rx-field{position:relative;margin-top:7px}
.rx-field svg.lead{position:absolute;left:14px;top:50%;width:18px;height:18px;transform:translateY(-50%);color:rgba(255,214,10,.75);pointer-events:none}
.rx-field input{box-sizing:border-box;width:100%;padding:13px 14px 13px 44px;border-radius:12px;border:1px solid rgba(255,214,10,.22);background:#141414;color:#fffbea;font-size:15px;outline:none;transition:border-color .15s,box-shadow .15s}
.rx-field input.pw{padding-right:48px}
.rx-field input::placeholder{color:rgba(255,251,234,.35)}
.rx-field input:focus{border-color:#ffd60a;box-shadow:0 0 0 3px rgba(255,214,10,.2)}
.rx-eye{position:absolute;right:6px;top:50%;width:36px;height:36px;transform:translateY(-50%);display:grid;place-items:center;border:0;border-radius:9px;background:transparent;color:rgba(255,251,234,.55);cursor:pointer;transition:color .15s,background .15s}
.rx-eye:hover{color:#ffd60a;background:rgba(255,214,10,.12)}
.rx-eye svg{width:18px;height:18px}
.rx-msg{margin:0 0 16px;padding:10px 12px;border-radius:10px;font-size:13px}
.rx-msg.err{color:#ff9a9a;background:rgba(255,80,80,.12);box-shadow:inset 0 0 0 1px rgba(255,90,90,.4)}
.rx-msg.ok{color:#ffe566;background:rgba(255,214,10,.1);box-shadow:inset 0 0 0 1px rgba(255,214,10,.3)}
.rx-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:8px;padding:15px;border:0;border-radius:12px;font-size:16px;font-weight:800;color:#0a0a0a;cursor:pointer;background:#ffd60a;box-shadow:0 10px 30px rgba(255,214,10,.22);transition:transform .15s,box-shadow .15s,background .15s}
.rx-btn:hover:not(:disabled){transform:translateY(-1px);background:#ffe14d;box-shadow:0 14px 36px rgba(255,214,10,.35)}
.rx-btn:disabled{opacity:.7;cursor:wait}
.rx-btn svg{width:18px;height:18px}
.rx-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(10,10,10,.3);border-top-color:#0a0a0a;animation:rx-spin .7s linear infinite}
.rx-foot{margin:22px 0 0;text-align:center;font-size:12px;color:rgba(255,251,234,.45)}
.rx-form button:focus-visible{outline:2px solid #ffd60a;outline-offset:2px}

/* ---------- image side ---------- */
.rx-hero{position:relative;display:none;overflow:hidden;flex-direction:column;align-items:center;justify-content:center;padding:48px 52px;color:#0a0a0a;background:linear-gradient(150deg,#ffe14d 0%,#ffd60a 45%,#ffb800 100%)}
@media (min-width:900px){.rx-hero{display:flex}}
.rx-hero::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(0,0,0,.14) 1.4px,transparent 1.4px);background-size:20px 20px;-webkit-mask-image:linear-gradient(180deg,transparent,#000 75%);mask-image:linear-gradient(180deg,transparent,#000 75%)}
.rx-hero>*{position:relative;z-index:1}
.rx-art{width:100%;display:flex;align-items:center;justify-content:center}
.rx-art svg{display:block;width:100%;max-width:620px;height:auto;max-height:66vh;overflow:visible}
.rx-fl1{animation:rx-fl 6s ease-in-out infinite}
.rx-fl2{animation:rx-fl 7s ease-in-out -2s infinite}
.rx-fl3{animation:rx-fl 8s ease-in-out -4s infinite}
.rx-tags{position:absolute;left:0;right:0;bottom:36px;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;padding:0 24px}
.rx-tags span{padding:6px 12px;border-radius:999px;background:#0a0a0a;color:#ffd60a;font-size:12px;font-weight:700}
.rx-hero.photo{background-size:cover;background-position:center;color:#fff}
.rx-hero.photo::before{display:none}
.rx-hero.photo::after{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(160deg,rgba(10,10,10,.7),rgba(255,214,10,.35))}
.rx-hero.photo .rx-art{visibility:hidden}
@media (prefers-reduced-motion:reduce){.rx-box,.rx-fl1,.rx-fl2,.rx-fl3,.rx-spin{animation:none}}
`;

const Svg = ({ className, children }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const TILES = [[192, 118], [270, 118], [348, 118], [192, 166], [270, 166], [348, 166]];
const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

function Illustration() {
  return (
    <svg viewBox="0 0 600 420" role="img" aria-label="Point of sale terminal with card reader and receipt" fontFamily={FONT}>
      <circle cx="300" cy="225" r="175" fill="#0a0a0a" />
      <ellipse cx="300" cy="372" rx="200" ry="12" fill="rgba(0,0,0,.22)" />

      {/* receipt */}
      <g transform="rotate(-8 90 290)">
        <path d="M44 214h92v146l-11.5-8-11.5 8-11.5-8-11.5 8-11.5-8-11.5 8-11.5-8-11.5 8z" fill="#fff" stroke="#0a0a0a" strokeWidth="4" strokeLinejoin="round" />
        <rect x="56" y="232" width="44" height="7" rx="3.5" fill="#0a0a0a" />
        <rect x="56" y="252" width="68" height="5" rx="2.5" fill="#d9d9d9" />
        <rect x="56" y="264" width="52" height="5" rx="2.5" fill="#d9d9d9" />
        <rect x="56" y="276" width="62" height="5" rx="2.5" fill="#d9d9d9" />
        <rect x="56" y="288" width="40" height="5" rx="2.5" fill="#d9d9d9" />
        <line x1="56" y1="306" x2="124" y2="306" stroke="#0a0a0a" strokeWidth="2" strokeDasharray="4 4" />
        <rect x="56" y="318" width="68" height="12" rx="4" fill="#ffd60a" />
      </g>

      {/* stand + base */}
      <rect x="280" y="290" width="40" height="34" fill="#fff" stroke="#0a0a0a" strokeWidth="4" />
      <rect x="232" y="320" width="136" height="16" rx="8" fill="#fff" stroke="#0a0a0a" strokeWidth="4" />

      {/* terminal */}
      <rect x="160" y="60" width="280" height="230" rx="26" fill="#fff" stroke="#0a0a0a" strokeWidth="4" />
      <rect x="176" y="76" width="248" height="172" rx="14" fill="#0a0a0a" />
      <text x="192" y="100" fontSize="12" fontWeight="800" fill="#ffd60a" letterSpacing="1.5">RETAILX</text>
      <circle cx="406" cy="95" r="4" fill="#ffd60a" />
      {TILES.map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="68" height="38" rx="9" fill={i === 0 ? '#ffd60a' : '#262626'} />
          <rect x={x + 10} y={y + 11} width="34" height="5" rx="2.5" fill={i === 0 ? '#0a0a0a' : 'rgba(255,255,255,.6)'} />
          <rect x={x + 10} y={y + 23} width="22" height="5" rx="2.5" fill={i === 0 ? '#0a0a0a' : '#ffd60a'} />
        </g>
      ))}
      <rect x="192" y="214" width="224" height="26" rx="8" fill="#ffd60a" />
      <text x="204" y="231" fontSize="11" fontWeight="800" fill="#0a0a0a">TOTAL</text>
      <text x="404" y="232" fontSize="14" fontWeight="800" fill="#0a0a0a" textAnchor="end">Rs 1,150</text>
      <circle cx="300" cy="269" r="5" fill="#ffd60a" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="280" cy="269" r="3.5" fill="#d9d9d9" />
      <circle cx="320" cy="269" r="3.5" fill="#d9d9d9" />

      {/* card reader */}
      <path d="M484 178a24 24 0 0 1 32 0M474 166a38 38 0 0 1 52 0" fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="500" cy="186" r="3.5" fill="#0a0a0a" />
      <rect x="456" y="196" width="88" height="140" rx="18" fill="#fff" stroke="#0a0a0a" strokeWidth="4" />
      <rect x="468" y="210" width="64" height="32" rx="6" fill="#0a0a0a" />
      <text x="500" y="231" fontSize="13" fontWeight="800" fill="#ffd60a" textAnchor="middle">PAID</text>
      {[266, 288, 310].flatMap((cy) => [480, 500, 520].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#0a0a0a" />))}

      {/* floating: sales card */}
      <g className="rx-fl1">
        <rect x="450" y="22" width="130" height="94" rx="18" fill="#fff" stroke="#0a0a0a" strokeWidth="4" />
        <rect x="468" y="78" width="16" height="18" rx="4" fill="#0a0a0a" />
        <rect x="492" y="64" width="16" height="32" rx="4" fill="#0a0a0a" />
        <rect x="516" y="48" width="16" height="48" rx="4" fill="#ffd60a" stroke="#0a0a0a" strokeWidth="2" />
        <path d="M542 56l14-14m0 0h-10m10 0v10" fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <text x="540" y="86" fontSize="13" fontWeight="800" fill="#0a0a0a">+12%</text>
      </g>

      {/* floating: coins */}
      <g className="rx-fl2">
        <circle cx="76" cy="132" r="24" fill="#0a0a0a" />
        <circle cx="76" cy="132" r="17" fill="none" stroke="#ffd60a" strokeWidth="2.5" />
        <text x="76" y="137" fontSize="14" fontWeight="800" fill="#ffd60a" textAnchor="middle">Rs</text>
      </g>
      <g className="rx-fl3">
        <circle cx="540" cy="372" r="18" fill="#0a0a0a" />
        <circle cx="540" cy="372" r="12" fill="none" stroke="#ffd60a" strokeWidth="2.5" />
      </g>
      <circle cx="40" cy="60" r="7" fill="#0a0a0a" />
      <circle cx="560" cy="170" r="5" fill="#0a0a0a" />
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [flash] = useState(() => {
    const f = sessionStorage.getItem('flash');
    sessionStorage.removeItem('flash');
    return f;
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: form });
      localStorage.setItem('token', token);
      onLogin(user);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="rx">
      <style>{css}</style>

      {/* ---- login side ---- */}
      <section className="rx-form">
        <div className="rx-strip" />
        <div className="rx-form-in">
          <form className="rx-box" onSubmit={submit}>
            <div className="rx-brand">
              <span className="rx-mark"><Svg><path d="M6 6l12 12M18 6L6 18" strokeWidth="3.2" /></Svg></span>
              <span className="rx-name">retail<b>X</b></span>
            </div>

            <h1>Welcome back</h1>
            <p className="rx-sub">Sign in to start selling.</p>

            <label className="rx-label">Email
              <div className="rx-field">
                <Svg className="lead"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 7l9 6 9-6" /></Svg>
                <input type="email" placeholder="you@store.com" autoComplete="username" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
              </div>
            </label>

            <label className="rx-label">Password
              <div className="rx-field">
                <Svg className="lead"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
                <input className="pw" type={show ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="button" className="rx-eye" onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                  <Svg>
                    {show
                      ? <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3.2 3.7M6.4 7.8C4 9.5 3 12 3 12s4 6 9 6c1.3 0 2.5-.3 3.6-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
                      : <><path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z" /><circle cx="12" cy="12" r="3" /></>}
                  </Svg>
                </button>
              </div>
            </label>

            {flash && <p className="rx-msg ok" role="status">{flash}</p>}
            {error && <p className="rx-msg err" role="alert">{error}</p>}

            <button className="rx-btn" disabled={busy}>
              {busy ? <><span className="rx-spin" />Signing in…</> : <>Sign in <Svg><path d="M9 18l6-6-6-6" /></Svg></>}
            </button>
            <p className="rx-foot">Forgot your password? Ask your store admin to reset it.</p>
          </form>
        </div>
      </section>

      {/* ---- image side ---- */}
      <aside className={`rx-hero${HERO_IMAGE ? ' photo' : ''}`} style={HERO_IMAGE ? { backgroundImage: `url(${HERO_IMAGE})` } : undefined}>
        <div className="rx-art"><Illustration /></div>
        <div className="rx-tags"><span>Fast checkout</span><span>Live stock</span><span>Daily reports</span></div>
      </aside>
    </div>
  );
}