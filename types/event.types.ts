export type EventType = 'wednesday' | 'sunday' | 'custom' | 'prime';

export type EventStatus =
  | 'upcoming'
  | 'open'
  | 'full'
  | 'in_progress'
  | 'finished'
  | 'cancelled';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wednesday: 'Bate-bola Quarta',
  sunday: 'Bate-bola Domingo',
  custom: 'Personalizado',
  prime: 'Prime',
};

export const EVENT_TYPE_MAX_PARTICIPANTS: Record<EventType, number> = {
  wednesday: 3,
  sunday: 28,
  custom: 0, // definido pelo admin
  prime: 3,
};

export interface Event {
  id: string;
  title: string;
  type: EventType;
  eventDate: Date;
  location: string;
  maxParticipants: number;
  registrationOpensAt: Date;
  status: EventStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  notificationsSent: {
    oneHourBefore: boolean;
    fiveMinutesBefore: boolean;
  };
  confirmedCount: number;
  waitlistCount: number;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
}
