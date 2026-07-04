// The two consumer-protection badges Romanian e-commerce sites must display,
// linking to the official pages: ANPC-SAL (alternative dispute resolution) and
// SOL (the EU online dispute-resolution page). Drawn as inline SVGs in the
// official blue so they stay crisp everywhere with no external image host.
const BLUE = '#2b4e9b';
const GOLD = '#f4c421';

function Stars({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // Simplified EU star ring (12 dots — reads as the EU emblem at badge size).
  return (
    <g fill={GOLD}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={1.6} />;
      })}
    </g>
  );
}

export function AnpcBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href="https://anpc.ro/ce-este-sal/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ANPC — Soluționarea Alternativă a Litigiilor"
        className="block hover:opacity-90 transition-opacity"
      >
        <svg width="210" height="46" viewBox="0 0 210 46" role="img">
          <rect width="210" height="46" rx="6" fill={BLUE} />
          <Stars cx={26} cy={23} r={12} />
          <text x={26} y={27} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">SAL</text>
          <text x={48} y={19} fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">ANPC — SAL</text>
          <text x={48} y={31} fill="#fff" fontSize="7.2" fontFamily="Arial, sans-serif">Soluționarea Alternativă a Litigiilor</text>
          <text x={48} y={40} fill="#cdd9f0" fontSize="6.4" fontFamily="Arial, sans-serif">anpc.ro/ce-este-sal</text>
        </svg>
      </a>
      <a
        href="https://ec.europa.eu/consumers/odr"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="SOL — Soluționarea Online a Litigiilor"
        className="block hover:opacity-90 transition-opacity"
      >
        <svg width="210" height="46" viewBox="0 0 210 46" role="img">
          <rect width="210" height="46" rx="6" fill={BLUE} />
          <Stars cx={26} cy={23} r={12} />
          <text x={26} y={27} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">SOL</text>
          <text x={48} y={19} fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">SOL — litigii online</text>
          <text x={48} y={31} fill="#fff" fontSize="7.2" fontFamily="Arial, sans-serif">Soluționarea Online a Litigiilor</text>
          <text x={48} y={40} fill="#cdd9f0" fontSize="6.4" fontFamily="Arial, sans-serif">ec.europa.eu/consumers/odr</text>
        </svg>
      </a>
    </div>
  );
}
