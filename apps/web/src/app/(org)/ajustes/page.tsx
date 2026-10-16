import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InfoIcon } from 'lucide-react';
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
import { GRADING_SCALE_GRANTS } from '@/lib/auth/permissions';
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

export default function SettingsPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Ajustes' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<Skeleton className="h-96 max-w-3xl rounded-xl" />}>
          <GradingScaleCard />
        </Suspense>
      </PanelContent>
    </>
  );
}
