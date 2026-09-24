import { APIError } from 'better-auth/api';
import rejectInvitationHook from '@auth/hooks/reject-invitation.hook';

describe('rejectInvitationHook', () => {
  it('always rejects with 403', async () => {
    const promise = rejectInvitationHook();

    await expect(promise).rejects.toBeInstanceOf(APIError);
    await expect(promise).rejects.toMatchObject({ status: 'FORBIDDEN' });
  });
});
