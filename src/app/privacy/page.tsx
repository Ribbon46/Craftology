import { LegalDoc } from '@/components/LegalDoc';
import { PRIVACY } from '@/content/legal';

export const metadata = { title: 'Politica de Confidențialitate · Craftology' };

export default function PrivacyPage() {
  return <LegalDoc doc={PRIVACY} />;
}
