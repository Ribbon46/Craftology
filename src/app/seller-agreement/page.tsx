import { LegalDoc } from '@/components/LegalDoc';
import { SELLER_AGREEMENT } from '@/content/legal';

export const metadata = { title: 'Acordul Vânzătorului · Craftology' };

export default function SellerAgreementPage() {
  return <LegalDoc doc={SELLER_AGREEMENT} />;
}
