import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GraduationCapIcon } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, apiFetch } from '@/lib/api/api-fetch';
import { LookupForm, type PortalYear } from './_components/lookup-form';

export const metadata: Metadata = { title: 'Consulta de notas' };

type Props = PageProps<'/consulta-notas/[orgSlug]'>;

type PortalInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  reportCardsEnabled: boolean;
  // Del más reciente al más antiguo.
  academicYears: PortalYear[];
};

async function Portal({ params }: Props) {
  const { orgSlug } = await params;

  let portal: PortalInfo;
  try {
    portal = await apiFetch<PortalInfo>(
      `/public/organizations/${encodeURIComponent(orgSlug)}/info`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <div className="flex items-center gap-2 self-center font-medium">
        {portal.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portal.logoUrl} alt="" className="size-8 rounded-md" />
        ) : (
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
            <GraduationCapIcon className="size-5" />
          </div>
        )}
        {portal.name}
      </div>
      {portal.reportCardsEnabled && portal.academicYears.length ? (
        <LookupForm slug={portal.slug} years={portal.academicYears} />
      ) : (
        <Card className="mx-auto w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Consulta de notas</CardTitle>
            <CardDescription className="text-base">
              {portal.reportCardsEnabled
                ? 'El colegio aún no tiene años escolares para consultar.'
                : 'Este colegio no tiene habilitada la consulta de notas.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}

// Portal sin login: el estudiante o su acudiente consulta con año lectivo +
// documento.
export default function ReportCardPortalPage(props: Props) {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center p-6 md:p-10">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <Suspense
          fallback={
            <Spinner className="text-muted-foreground size-6 self-center" />
          }
        >
          <Portal {...props} />
        </Suspense>
      </div>
    </div>
  );
}
