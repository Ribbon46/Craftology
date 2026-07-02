import { LegalDoc } from '@/components/LegalDoc';
import { COOKIES } from '@/content/legal';

export const metadata = { title: "Politica de Cookie-uri · Craft'zaar" };

export default function CookiesPage() {
  return <LegalDoc doc={COOKIES} />;
}
