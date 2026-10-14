import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, homeFor } from '@/lib/auth/current-user';
import { Spinner } from '@/components/ui/spinner';

// Tras el login se llega aquí y se envía a cada uno a su panel.
async function RedirectHome(): Promise<never> {
  redirect(homeFor(await getCurrentUser()));
}

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={<Spinner className="text-muted-foreground size-6" />}>
        <RedirectHome />
      </Suspense>
    </main>
  );
}
