// Themed QR code linking to the live site, for easy sharing / scanning.
// The SVG is pre-generated (scripts: qrcode lib) with the site's warm espresso
// on cream so it scans reliably while sitting on-theme. Inlined so there's no
// runtime dependency; regenerate if the production URL changes.
export function QRShare() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-[1.5px] border-line-strong bg-surface/70 shadow-[3px_3px_0_0_var(--press-soft)] p-3 mb-5 lg:mb-7 max-w-sm">
      <div className="w-[76px] h-[76px] shrink-0 rounded-xl overflow-hidden border border-line bg-[#f6f0e4]">
        <svg viewBox="0 0 31 31" shapeRendering="crispEdges" className="w-full h-full" role="img" aria-label="Cod QR către Craft'zaar">
          <path fill="#f6f0e4" d="M0 0h31v31H0z" />
          <path
            stroke="#2a211a"
            d="M1 1.5h7m2 0h1m2 0h1m1 0h1m3 0h2m2 0h7M1 2.5h1m5 0h1m1 0h1m2 0h3m5 0h2m1 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m4 0h2m2 0h1m4 0h1m1 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m2 0h1m2 0h2m4 0h2m2 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h1m1 0h4m2 0h4m2 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m4 0h1m2 0h2m1 0h1m1 0h2m1 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M10 8.5h2m4 0h1m1 0h1m1 0h2M1 9.5h1m1 0h1m1 0h1m1 0h1m2 0h1m1 0h2m4 0h2m1 0h1m3 0h1m2 0h1M1 10.5h4m4 0h1m1 0h1m2 0h1m2 0h1m3 0h1m1 0h1m2 0h1m2 0h1M1 11.5h1m4 0h2m2 0h1m1 0h2m1 0h1m1 0h2m2 0h3m3 0h3M2 12.5h2m1 0h2m4 0h2m1 0h3m1 0h1m1 0h1m1 0h1m5 0h1M1 13.5h5m1 0h1m2 0h1m2 0h1m1 0h1m2 0h1m3 0h2m2 0h1m1 0h2M1 14.5h1m1 0h1m1 0h2m1 0h5m2 0h1m1 0h3m1 0h3m2 0h1m2 0h1M2 15.5h1m2 0h5m1 0h2m1 0h1m3 0h1m3 0h1m1 0h3m1 0h2M3 16.5h4m2 0h1m2 0h2m2 0h1m1 0h1m1 0h2m1 0h2m1 0h1m1 0h1M2 17.5h1m1 0h2m1 0h6m4 0h2m1 0h4m2 0h1m1 0h2M3 18.5h2m1 0h1m5 0h1m1 0h1m2 0h2m3 0h2m2 0h2m1 0h1M1 19.5h1m3 0h4m2 0h1m1 0h1m1 0h1m1 0h1m4 0h1m5 0h2M2 20.5h4m2 0h3m2 0h3m1 0h4m1 0h1m1 0h1m1 0h1m1 0h1M1 21.5h1m1 0h2m2 0h2m1 0h2m3 0h4m1 0h6M9 22.5h1m1 0h1m1 0h1m1 0h1m2 0h2m1 0h1m3 0h1m1 0h3M1 23.5h7m2 0h2m1 0h2m2 0h5m1 0h1m1 0h2m1 0h2M1 24.5h1m5 0h1m2 0h3m3 0h3m2 0h1m3 0h2m2 0h1M1 25.5h1m1 0h3m1 0h1m1 0h2m2 0h1m2 0h3m2 0h5m3 0h1M1 26.5h1m1 0h3m1 0h1m4 0h2m3 0h2m2 0h1m3 0h1m1 0h3M1 27.5h1m1 0h3m1 0h1m1 0h1m1 0h1m3 0h1m2 0h4m2 0h3m2 0h1M1 28.5h1m5 0h1m2 0h1m2 0h2m1 0h6m1 0h1m1 0h1m2 0h1M1 29.5h7m1 0h1m1 0h1m2 0h1m2 0h2m1 0h3m2 0h1m2 0h2"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="font-display text-ink leading-tight">Distribuie Craft&apos;zaar</p>
        <p className="text-xs text-ink-soft leading-snug mt-0.5">Scanează codul ca să deschizi magazinul pe telefon.</p>
      </div>
    </div>
  );
}
