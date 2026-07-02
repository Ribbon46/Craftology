import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { LegalDocContent, LegalBlock } from '@/content/legal';

// Linkify emails + URLs inside a paragraph; everything else is rendered verbatim.
function renderText(s: string) {
  const parts = s.split(/(\S+@\S+\.[A-Za-z]{2,}|https?:\/\/\S+|www\.[^\s,;]+)/g);
  return parts.map((p, i) => {
    if (/^\S+@\S+\.[A-Za-z]{2,}$/.test(p)) {
      return (
        <a key={i} href={`mailto:${p}`} className="text-clay underline underline-offset-2 break-words">
          {p}
        </a>
      );
    }
    if (/^https?:\/\//.test(p) || /^www\./.test(p)) {
      const href = p.startsWith('http') ? p : `https://${p}`;
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-clay underline underline-offset-2 break-words">
          {p}
        </a>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/** Renders a lawyer document (title + last-updated + verbatim blocks). Consecutive
 *  bullet blocks are grouped into a single list. */
export function LegalDoc({ doc }: { doc: LegalDocContent }) {
  const out: React.ReactNode[] = [];
  let bullets: LegalBlock[] = [];
  let bulletKey = 0;

  const flush = () => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={`ul-${bulletKey++}`} className="list-disc pl-5 space-y-1.5 my-2">
        {bullets.map((b, i) => (
          <li key={i}>{renderText(b.s)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  doc.blocks.forEach((b, i) => {
    if (b.t === 'li') {
      bullets.push(b);
      return;
    }
    flush();
    if (b.t === 'h') {
      out.push(
        <h2 key={i} className="font-display text-lg text-ink mt-7 mb-1">
          {renderText(b.s)}
        </h2>,
      );
    } else {
      out.push(<p key={i}>{renderText(b.s)}</p>);
    }
  });
  flush();

  return (
    <div className="min-h-screen px-5 py-6 pb-24 max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center text-ink-soft hover:text-clay mb-5 text-sm">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Înapoi
      </Link>
      <h1 className="font-display text-3xl text-ink mb-1 text-balance">{doc.title}</h1>
      <p className="text-xs text-ink-faint mb-6">Ultima actualizare: {doc.updated}</p>
      <div className="space-y-3.5 text-sm text-ink-soft leading-relaxed">{out}</div>
    </div>
  );
}
