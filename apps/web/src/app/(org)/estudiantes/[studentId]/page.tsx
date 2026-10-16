import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LockIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
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
import { ORG_HOME, requireOrgUser } from '@/lib/auth/current-user';
import {
  ENROLLMENT_GRANTS,
  isGranted,
  STUDENT_GRANTS,
} from '@/lib/auth/permissions';
import {
  STUDENT_STATUS_LABELS,
  type Student,
  type StudentStatus,
} from '../types';
import { HistoryTimeline } from './_components/history-timeline';
import type { StudentHistory } from './types';

export const metadata: Metadata = { title: 'Ficha del estudiante' };

// 404 si no existe o no es de sus salones (profesor), 400 si el id no es UUID.
const orNotFound = async <T,>(request: Promise<T>) => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }
};

// El admin ve la ficha completa; el profesor, el historial de sus estudiantes.
async function access() {
  const me = await requireOrgUser();
  const canHistory =
    isGranted(me, ENROLLMENT_GRANTS.list) ||
    isGranted(me, ENROLLMENT_GRANTS.classes);
  const canProfile = isGranted(me, STUDENT_GRANTS.list);
  if (!canHistory && !canProfile) redirect(ORG_HOME);
  return { canHistory, canProfile };
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  );
}

type Params = PageProps<'/estudiantes/[studentId]'>['params'];

async function StudentLoad({ params }: { params: Params }) {
  const { studentId } = await params;
  const { canHistory, canProfile } = await access();

  const [history, profile] = await Promise.all([
    canHistory
      ? orNotFound(
          authFetch<StudentHistory>(`/students/${studentId}/enrollments`),
        )
      : null,
    canProfile
      ? orNotFound(authFetch<Student>(`/students/${studentId}`))
      : null,
  ]);

  const student = (profile ?? history?.student)!;
  const current = history?.enrollments.findLast(
    ({ status }) => status === 'in_progress',
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {student.firstName} {student.lastName}
            <Badge variant="secondary">
              {STUDENT_STATUS_LABELS[student.status as StudentStatus] ??
                student.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            {student.documentType} {student.documentNumber} · Código{' '}
            {student.studentCode}
            {current &&
              ` · Cursando ${current.classroom?.name ?? ''} en ${current.academicYear?.name ?? ''}`}
          </CardDescription>
        </CardHeader>
        {profile && (
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Row label="Fecha de nacimiento" value={profile.birthDate} />
              <Row label="Acudiente" value={profile.guardianName} />
              <Row
                label="Teléfono del acudiente"
                value={profile.guardianPhone}
              />
              <Row label="Correo del acudiente" value={profile.guardianEmail} />
            </dl>
          </CardContent>
        )}
      </Card>

      <h2 className="text-base font-semibold">Historial académico</h2>
      {history ? (
        <HistoryTimeline enrollments={history.enrollments} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockIcon />
            </EmptyMedia>
            <EmptyTitle>Sin acceso</EmptyTitle>
            <EmptyDescription>
              Tu organización no tiene habilitado ver el historial de
              matrículas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}

// Las migas dependen del rol (sesión), por eso van dentro del Suspense.
async function StudentHeader() {
  const { canProfile } = await access();
  return (
    <PanelHeader
      crumbs={[
        canProfile
          ? { label: 'Estudiantes', href: '/estudiantes' }
          : { label: 'Mis clases', href: '/mis-clases' },
        { label: 'Ficha' },
      ]}
    />
  );
}

export default function StudentPage({
  params,
}: PageProps<'/estudiantes/[studentId]'>) {
  return (
    <>
      <Suspense fallback={<PanelHeader crumbs={[{ label: 'Ficha' }]} />}>
        <StudentHeader />
      </Suspense>
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <StudentLoad params={params} />
        </Suspense>
      </PanelContent>
    </>
  );
}
