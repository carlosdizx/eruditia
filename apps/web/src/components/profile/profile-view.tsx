import { Building2Icon, KeyRoundIcon, ShieldCheckIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { isSuperAdmin } from '@/lib/auth/current-user';
import { PERMISSION_LABELS } from '@/lib/auth/permissions';
import type { CurrentUser } from '@/lib/auth/types';
import { formatDate, formatDateTime, initialsOf } from '@/lib/format';

const STATUS_LABELS: Record<CurrentUser['status'], string> = {
  pending: 'Pendiente',
  active: 'Activo',
  suspended: 'Suspendido',
  blocked: 'Bloqueado',
};

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function ProfileView({ user }: { user: CurrentUser }) {
  const superAdmin = isSuperAdmin(user);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="truncate text-xl">
              {user.firstName} {user.lastName}
            </CardTitle>
            <CardDescription className="truncate">{user.email}</CardDescription>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={superAdmin ? 'default' : 'secondary'}>
                {user.role.labelEs}
              </Badge>
              <Badge variant="outline">{STATUS_LABELS[user.status]}</Badge>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Documento" value={user.documentNumber ?? '—'} />
            <Detail label="Teléfono" value={user.phone ?? '—'} />
            <Detail
              label="Verificación en dos pasos"
              value={
                user.twoFactorEnabled ? 'Activada (correo)' : 'Desactivada'
              }
            />
            <Detail
              label="Último inicio de sesión"
              value={formatDateTime(user.lastLoginAt)}
            />
            <Detail label="Miembro desde" value={formatDate(user.createdAt)} />
            <Detail
              label="Cuenta verificada"
              value={user.isVerified ? 'Sí' : 'No'}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2Icon className="text-muted-foreground size-4" />
              Organización
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.organization ? (
              <dl className="grid gap-3">
                <Detail label="Nombre" value={user.organization.name} />
                <Detail
                  label="Identificador"
                  value={
                    <code className="text-xs">{user.organization.slug}</code>
                  }
                />
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">
                Usuario del sistema, no pertenece a ninguna organización.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRoundIcon className="text-muted-foreground size-4" />
              Permisos
            </CardTitle>
            <CardDescription>
              {superAdmin
                ? 'Acceso total a la administración del sistema.'
                : 'Lo que tu organización tiene habilitado.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {superAdmin ? (
              <Badge>
                <ShieldCheckIcon data-icon="inline-start" />
                Super administrador
              </Badge>
            ) : user.permissions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary">
                    {PERMISSION_LABELS[permission] ?? permission}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Tu organización aún no tiene permisos asignados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="bg-muted h-64 animate-pulse rounded-xl lg:col-span-2" />
      <div className="flex flex-col gap-4">
        <div className="bg-muted h-32 animate-pulse rounded-xl" />
        <div className="bg-muted h-32 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
