import { ImageResponse } from 'next/og';

export const alt = "Craft'zaar — produse handmade românești";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Branded default Open Graph image for the homepage + any route without its own
// (listing pages set their product image via generateMetadata). Atelier palette.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: '#f6f0e4',
          color: '#2a211a',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 10, textTransform: 'uppercase', color: '#b9572f' }}>
          Handmade Românesc
        </div>
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, marginTop: 20, color: '#984427' }}>
          Craft&apos;zaar
        </div>
        <div style={{ display: 'flex', fontSize: 44, marginTop: 14 }}>Lucrate manual, cu suflet.</div>
        <div style={{ display: 'flex', fontSize: 27, marginTop: 28, color: '#6f6153' }}>
          Accesorii · Haine · Home
        </div>
        <div style={{ display: 'flex', width: 150, height: 7, marginTop: 44, background: '#b9572f', borderRadius: 4 }} />
      </div>
    ),
    { ...size },
  );
}
