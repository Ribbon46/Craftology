import { LegalDoc } from '@/components/LegalDoc';
import { RETURNS } from '@/content/legal';

export const metadata = { title: "Politica de Retururi și Rambursări · Craft'zaar" };

export default function ReturnsPage() {
  return <LegalDoc doc={RETURNS} />;
}
