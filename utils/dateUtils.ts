import { format, formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatEventDate(date: Date): string {
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function formatEventTime(date: Date): string {
  return format(date, 'HH:mm', { locale: ptBR });
}

export function formatDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
}

export function formatOpeningCountdown(date: Date): string {
  if (isPast(date)) return 'Lista aberta';
  const hours = differenceInHours(date, new Date());
  if (hours < 1) return 'Abre em menos de 1 hora';
  return `Abre ${formatRelativeTime(date)}`;
}

export function isListOpen(registrationOpensAt: Date): boolean {
  return isPast(registrationOpensAt);
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
