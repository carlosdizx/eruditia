'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { logout, type LogoutState } from '@/lib/auth/logout';

export function useLogout() {
  const [state, formAction, pending] = useActionState<LogoutState>(logout, {
    status: 'idle',
  });

  useEffect(() => {
    if (state.status === 'error') toast.error(state.message);
  }, [state]);

  return {
    formAction,
    pending,
    // Para disparar el logout fuera de un <form> (p. ej. desde un menú).
    logout: () => startTransition(() => formAction()),
  };
}
