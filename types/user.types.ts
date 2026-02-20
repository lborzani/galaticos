export type UserRole = 'member' | 'admin';

export type PlayerPosition =
  | 'levantador'
  | 'ponteiro'
  | 'central'
  | 'oposto'
  | 'libero'
  | 'universal';

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  levantador: 'Levantador',
  ponteiro: 'Ponteiro',
  central: 'Central',
  oposto: 'Oposto',
  libero: 'Líbero',
  universal: 'Universal',
};

export interface User {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  position?: PlayerPosition;
  availableForTeam: boolean;
  fcmToken?: string;
  fcmTokenUpdatedAt?: Date;
  createdAt: Date;
  isActive: boolean;
}
