import { z } from 'zod';

const PLAYER_POSITIONS = [
  'levantador',
  'ponteiro',
  'central',
  'oposto',
  'libero',
  'universal',
] as const;

export const userProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{8,20}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  position: z.enum(PLAYER_POSITIONS, { message: 'Posição inválida' }).optional(),
  availableForTeam: z.boolean(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
