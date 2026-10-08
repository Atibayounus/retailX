import { useEffect, useId, useRef, useState } from 'react';
import { money, compact } from '../api.js';

const H = 290;
const PAD = { l: 52, r: 14, t: 14, b: 30 };

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Responsive SVG area chart of daily sales. data: [{ date: 'YYYY-MM-DD', revenue, orders }]
export default function SalesChart({ data }) {
  const wrap = useRef(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, '');

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = data.length;
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const max = niceMax(Math.max(...data.map((d) => d.revenue), 100));
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i) => PAD.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => PAD.t + ih - (v / max) * ih;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${PAD.t + ih} L${x(0).toFixed(1)},${PAD.t + ih} Z`;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max * i) / 4);
  const step = Math.ceil(n / (w < 480 ? 4 : 7));
  const showLabel = (i) => i === n - 1 || (i % step === 0 && n - 1 - i >= step / 2);

  const hd = hover !== null ? data[hover] : null;
  const tw = 150, th = 54;
  const tx = hd ? Math.min(Math.max(x(hover) - tw / 2, PAD.l), w - PAD.r - tw) : 0;
  const ty = hd ? Math.max(PAD.t, y(hd.revenue) - th - 12) : 0;

  return (
    <div ref={wrap} className="relative w-full">
      <svg width={w} height={H} role="img" aria-label={`Sales over the last ${n} days, total ${money(total)}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd60a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffd60a" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`stroke-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffb800" />
            <stop offset="1" stopColor="#ffd60a" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke="rgba(255,251,234,0.1)" strokeDasharray={t ? '4 4' : '0'} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="rgba(255,251,234,0.55)">{compact(t)}</text>
          </g>
        ))}

        <path d={area} fill={`url(#fill-${gid})`} />
        <path d={line} fill="none" stroke={`url(#stroke-${gid})`} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) => (
          <g key={d.date}>
            {n <= 14 && <circle cx={x(i)} cy={y(d.revenue)} r="3.5" fill="#0a0a0a" stroke="#ffd60a" strokeWidth="2" />}
            {showLabel(i) && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="rgba(255,251,234,0.55)">{fmtDate(d.date)}</text>}
          </g>
        ))}

        {hd && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="rgba(255,214,10,0.45)" strokeDasharray="4 4" />
            <circle cx={x(hover)} cy={y(hd.revenue)} r="5" fill="#ffd60a" stroke="#0a0a0a" strokeWidth="2" />
            <rect x={tx} y={ty} width={tw} height={th} rx="10" fill="#1f1f1f" stroke="rgba(255,214,10,0.4)" />
            <text x={tx + 12} y={ty + 18} fontSize="11" fill="rgba(255,251,234,0.65)">{fmtDate(hd.date)}</text>
            <text x={tx + 12} y={ty + 36} fontSize="13" fontWeight="700" fill="#fffbea">{money(hd.revenue)}</text>
            <text x={tx + 12} y={ty + 49} fontSize="10.5" fill="#ffd60a">{hd.orders} {hd.orders === 1 ? 'order' : 'orders'}</text>
          </g>
        )}

        {data.map((d, i) => (
          <rect key={d.date} x={x(i) - iw / Math.max(n - 1, 1) / 2} y={PAD.t} width={iw / Math.max(n - 1, 1)} height={ih}
            fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
        ))}
      </svg>
      {total === 0 && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <span className="text-sm text-ink/45 bg-card px-3 py-1 rounded-full">No sales in this period yet</span>
        </div>
      )}
    </div>
  );
}