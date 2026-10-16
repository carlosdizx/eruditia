import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CircleAlertIcon, LockIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import {
  ACADEMIC_YEAR_GRANTS,
  CLASSROOM_GRANTS,
  ENROLLMENT_GRANTS,
  isGranted,
} from '@/lib/auth/permissions';
import type { Classroom } from '../salones/types';
import { PromotionReview } from './_components/promotion-review';
import { PromotionSetup } from './_components/promotion-setup';
import type { PromotionPreview, PromotionYear } from './types';

export const metadata: Metadata = { title: 'Promoción anual' };

type SearchParams = PageProps<'/promocion'>['searchParams'];

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' && value ? value : undefined;

async function Promotion({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireGrant(ENROLLMENT_GRANTS.promote);

  // Para elegir años y salones hacen falta también esos permisos.
  if (
    !isGranted(me, ACADEMIC_YEAR_GRANTS.list) ||
    !isGranted(me, CLASSROOM_GRANTS.list)
  )
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon />
          </EmptyMedia>
          <EmptyTitle>Sin acceso</EmptyTitle>
          <EmptyDescription>
            El asistente necesita que tu organización tenga habilitado ver años
            lectivos y salones.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const params = await searchParams;
  const years = await authFetch<PromotionYear[]>('/academic-years');

  const sourceYear =
    years.find(({ id }) => id === single(params.sourceYear)) ??
    years.find(({ isActive }) => isActive) ??
    years[0];
  // Por defecto, el primer año abierto que empieza después del de origen.
  const targetYearId =
    single(params.targetYear) ??
    years
      .filter(
        ({ startDate, status }) =>
          status === 'open' && !!sourceYear && startDate > sourceYear.startDate,
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]?.id;

  const classrooms = sourceYear
    ? await authFetch<Classroom[]>(
        `/classrooms?academicYearId=${sourceYear.id}`,
      )
    : [];
  const classroomId = classrooms.find(
    ({ id }) => id === single(params.classroom),
  )?.id;

  let preview: PromotionPreview | null = null;
  let error: string | null = null;
  if (classroomId && targetYearId)
    try {
      preview = await authFetch<PromotionPreview>(
        `/promotions/preview?${new URLSearchParams({
          sourceClassroomId: classroomId,
          targetAcademicYearId: targetYearId,
        })}`,
      );
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status >= 500) throw cause;
      error = cause.message;
    }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Asistente de promoción</CardTitle>
          <CardDescription>
            Al cierre del año, elige un salón para promover a los aprobados al
            grado siguiente, dejar a los reprobados en el mismo grado y graduar
            a los del último grado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromotionSetup
            years={years}
            classrooms={classrooms.map(({ id, name, gradeLevel }) => ({
              id,
              name,
              gradeName: gradeLevel?.name ?? null,
            }))}
            sourceYearId={sourceYear?.id}
            classroomId={classroomId}
            targetYearId={targetYearId}
          />
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      {preview && (
        <PromotionReview
          // Se reinicia cuando cambia el salón, el año o quedan otros estudiantes.
          key={[
            classroomId,
            targetYearId,
            ...preview.students.map(({ enrollmentId }) => enrollmentId),
          ].join()}
          preview={preview}
        />
      )}
    </>
  );
}

export default function PromotionPage({
  searchParams,
}: PageProps<'/promocion'>) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Promoción anual' }]} />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <Promotion searchParams={searchParams} />
        </Suspense>
      </PanelContent>
    </>
  );
}
