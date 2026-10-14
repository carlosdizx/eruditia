'use client';

import { useState } from 'react';
import { CredentialsForm, type Challenge } from './credentials-form';
import { OtpForm } from './otp-form';

export function LoginFlow() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [email, setEmail] = useState('');

  if (challenge)
    return (
      <OtpForm
        key={challenge.challengeId}
        challenge={challenge}
        onBack={() => setChallenge(null)}
      />
    );

  return (
    <CredentialsForm
      defaultEmail={email}
      onChallenge={(next) => {
        setEmail(next.email);
        setChallenge(next);
      }}
    />
  );
}
