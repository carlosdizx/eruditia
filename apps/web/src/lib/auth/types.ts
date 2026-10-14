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

// Contrato de GET /auth/me.
export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'pending' | 'active' | 'suspended' | 'blocked';
  isActive: boolean;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: {
    id: string;
    name: string;
    label: string;
    labelEs: string;
    category: 'core' | 'client';
  };
  organization: { id: string; name: string; slug: string } | null;
  permissions: string[];
};
