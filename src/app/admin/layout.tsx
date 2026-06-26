import Link from 'next/link';
import { isAdminUser } from '@/actions/admin';
import { AdminNav } from '@/components/AdminNav';
import { Button } from '@/components/ui/button';

// Server-side admin gate for the whole /admin area (defense beyond the per-action
// isAdminUser checks). Renders the shared nav once; pages provide just content.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminUser())) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
        <h1 className="font-display text-2xl text-ink mb-2">Acces interzis</h1>
        <p className="text-ink-soft mb-6">Această secțiune e disponibilă doar administratorilor.</p>
        <Link href="/">
          <Button className="rounded-full">Înapoi acasă</Button>
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen px-4 py-6 pb-24 mx-auto w-full max-w-3xl">
      <AdminNav />
      {children}
    </div>
  );
}
