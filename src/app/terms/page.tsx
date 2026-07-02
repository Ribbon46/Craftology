import { LegalDoc } from '@/components/LegalDoc';
import { TERMS } from '@/content/legal';

export const metadata = { title: 'Termeni și Condiții · Craftology' };

export default function TermsPage() {
  return <LegalDoc doc={TERMS} />;
}
