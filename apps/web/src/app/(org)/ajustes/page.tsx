import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import { ExternalLinkIcon, InfoIcon } from 'lucide-react';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import {
  GRADING_SCALE_GRANTS,
  hasPermission,
  Permission,
} from '@/lib/auth/permissions';
import type { GradingScale } from '@/lib/grading/scale';
import { GradingScaleForm } from './_components/grading-scale-form';

export const metadata: Metadata = { title: 'Ajustes' };

async function GradingScaleCard() {
  await requireGrant(GRADING_SCALE_GRANTS.update);

  const scale = await authFetch<GradingScale>('/grading-scale');

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Escala de calificación</CardTitle>
        <CardDescription>
          Las planillas solo aceptan notas dentro del rango y resaltan en rojo
          las inferiores a la aprobatoria. También la usa el asistente de
          promoción.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {scale.isDefault && (
          <div className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            Aún no has guardado una escala: se está usando la predeterminada
            (1.0 a 5.0, aprueba con 3.0).
          </div>
        )}
        <GradingScaleForm scale={scale} />
      </CardContent>
    </Card>
  );
}

// Enlace que el colegio comparte con estudiantes y acudientes sin cuenta.
async function ReportCardPortalCard() {
  const me = await requireGrant(GRADING_SCALE_GRANTS.update);
  if (
    !me.organization ||
    !hasPermission(me.permissions, Permission.REPORT_CARD_VIEW)
  )
    return null;

  const incoming = await headers();
  const host = incoming.get('x-forwarded-host') ?? incoming.get('host');
  const protocol = incoming.get('x-forwarded-proto') ?? 'http';
  const url = `${protocol}://${host}/consulta-notas/${me.organization.slug}`;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Portal de consulta de notas</CardTitle>
        <CardDescription>
          Estudiantes y acudientes ven el boletín eligiendo el año escolar y
          escribiendo el documento del estudiante, sin claves.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1.5 text-sm font-medium break-all underline-offset-4 hover:underline"
        >
          {url}
          <ExternalLinkIcon className="size-4 shrink-0" />
        </a>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Ajustes' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<Skeleton className="h-96 max-w-3xl rounded-xl" />}>
          <GradingScaleCard />
        </Suspense>
        <Suspense>
          <ReportCardPortalCard />
        </Suspense>
      </PanelContent>
    </>
  );
}
