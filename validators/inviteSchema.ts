import { z } from 'zod';

export const inviteSchema = z.object({
  eventId: z.string().min(1, 'Evento inválido'),
  toUserId: z.string().min(1, 'Usuário de destino inválido'),
  toDisplayName: z.string().min(1, 'Nome do convidado inválido'),
});

export type InviteFormData = z.infer<typeof inviteSchema>;
