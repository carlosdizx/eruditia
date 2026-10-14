// Contratos de POST /auth/login y POST /auth/two-factor/verify.
export type SessionResponse = {
  twoFactorRequired: false;
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
};

export type TwoFactorChallengeResponse = {
  twoFactorRequired: true;
  method: 'email';
  challengeId: string;
  expiresAt: string;
};

export type LoginResponse = SessionResponse | TwoFactorChallengeResponse;
