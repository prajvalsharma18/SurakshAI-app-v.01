export type UserRole =
  | 'PERSONNEL'
  | 'WELFARE_OFFICER'
  | 'COMMANDER'
  | 'ADMIN';

export type User = {
  username: string;
  role: UserRole;
  personnelId?: string;
};

export type Session = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: User;
};

export type SessionView = Pick<Session, 'expiresAt' | 'user'>;

export type AuthStatus =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED';
