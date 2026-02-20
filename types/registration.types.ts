import type { PlayerPosition } from './user.types';

export type RegistrationStatus =
  | 'confirmed'
  | 'waitlist'
  | 'cancelled'
  | 'attended';

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  playerPosition?: PlayerPosition;
  status: RegistrationStatus;
  position: number;
  waitlistPosition?: number;
  registeredAt: Date;
  updatedAt: Date;
  passportToken?: string;
  passportQrData?: string;
  passportExpiresAt?: Date;
  passportScannedAt?: Date;
  passportScannedBy?: string;
}

// ——— Prime: convites ———

export type PrimeInviteStatus = 'pending' | 'accepted' | 'declined';

export interface PrimeInvite {
  id: string;
  eventId: string;
  eventTitle: string;
  captainId: string;
  captainName: string;
  captainAvatarUrl?: string;
  toUserId: string;
  toDisplayName: string;
  toAvatarUrl?: string;
  status: PrimeInviteStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ——— Prime: times ———

export interface PrimeTeamMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  position?: PlayerPosition;
  inviteStatus: PrimeInviteStatus;
  inviteId: string;
  addedAt: Date;
}

export interface PrimeTeam {
  /** ID = `${eventId}_${captainId}` */
  id: string;
  eventId: string;
  captainId: string;
  captainName: string;
  captainAvatarUrl?: string;
  members: PrimeTeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

// ——— Legado (mantido para compatibilidade) ———

export interface TeamMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  position?: PlayerPosition;
  inviteStatus: InviteStatus;
  registrationId: string;
}

export interface Team {
  id: string;
  eventId: string;
  organizerId: string;
  organizerName: string;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}
