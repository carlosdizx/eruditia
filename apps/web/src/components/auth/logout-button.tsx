'use client';

import { useActionState, useEffect } from 'react';
import { LogOutIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout, type LogoutState } from '@/lib/auth/logout';

type LogoutButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'type' | 'disabled'
>;

export function LogoutButton({ children, ...props }: LogoutButtonProps) {
  const [state, formAction, pending] = useActionState<LogoutState>(logout, {
    status: 'idle',
  });

  useEffect(() => {
    if (state.status === 'error') toast.error(state.message);
  }, [state]);

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
