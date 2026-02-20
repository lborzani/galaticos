import { z } from 'zod';

const MAX_PARTICIPANTS_BY_TYPE: Record<string, number> = {
  wednesday: 3,
  sunday: 28,
};

export const eventFormSchema = z
  .object({
    title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
    type: z.enum(['wednesday', 'sunday', 'custom'] as const, {
      message: 'Selecione o tipo do evento',
    }),
    eventDate: z.date({ message: 'Informe a data do evento' }),
    location: z.string().min(2, 'Informe o local'),
    maxParticipants: z.number().int().min(1, 'Mínimo 1 participante'),
    registrationOpensAt: z.date({ message: 'Informe quando a lista abre' }),
  })
  .superRefine((data, ctx) => {
    if (data.registrationOpensAt >= data.eventDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registrationOpensAt'],
        message: 'A abertura da lista deve ser anterior à data do evento',
      });
    }

    const fixedMax = MAX_PARTICIPANTS_BY_TYPE[data.type];
    if (fixedMax !== undefined && data.maxParticipants !== fixedMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxParticipants'],
        message: `Eventos do tipo "${data.type === 'wednesday' ? 'quarta' : 'domingo'}" devem ter exatamente ${fixedMax} participantes`,
      });
    }
  });

export type EventFormData = z.infer<typeof eventFormSchema>;
