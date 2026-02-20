import { Timestamp } from 'firebase/firestore';

export function toDate(value: unknown, field = 'desconhecido'): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (__DEV__) {
    console.warn(`[Firestore] Campo "${field}" com valor inesperado:`, value);
  }
  return new Date();
}

export function convertEventDates(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...data,
    eventDate: toDate(data.eventDate, 'eventDate'),
    registrationOpensAt: toDate(data.registrationOpensAt, 'registrationOpensAt'),
    createdAt: toDate(data.createdAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt, 'updatedAt'),
  };
  if (data.cancelledAt) result.cancelledAt = toDate(data.cancelledAt, 'cancelledAt');
  return result;
}

export function convertRegistrationDates(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...data,
    registeredAt: toDate(data.registeredAt, 'registeredAt'),
    updatedAt: toDate(data.updatedAt, 'updatedAt'),
  };
  if (data.passportExpiresAt) result.passportExpiresAt = toDate(data.passportExpiresAt, 'passportExpiresAt');
  if (data.passportScannedAt) result.passportScannedAt = toDate(data.passportScannedAt, 'passportScannedAt');
  return result;
}

export function convertPrimeTeamDates(data: Record<string, unknown>): Record<string, unknown> {
  const members = Array.isArray(data.members)
    ? (data.members as Record<string, unknown>[]).map((m, i) => ({
        ...m,
        addedAt: toDate(m.addedAt, `members[${i}].addedAt`),
      }))
    : [];
  return {
    ...data,
    members,
    createdAt: toDate(data.createdAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt, 'updatedAt'),
  };
}

export function convertPrimeInviteDates(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    createdAt: toDate(data.createdAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt, 'updatedAt'),
  };
}
