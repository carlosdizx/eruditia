'use client';

import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLogout } from './use-logout';

type LogoutButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'type' | 'disabled'
>;

export function LogoutButton({ children, ...props }: LogoutButtonProps) {
  const { formAction, pending } = useLogout();

  return (
    <form action={formAction}>
      <Button type="submit" disabled={pending} {...props}>
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <LogOutIcon data-icon="inline-start" />
        )}
        {children ?? 'Cerrar sesión'}
      </Button>
    </form>
  );
}
