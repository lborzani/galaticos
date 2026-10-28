/// <reference path="../pb_data/types.d.ts" />

// Regras de evento que as API rules não expressam (vale para API e painel).
onRecordValidate((e) => {
  const FIXED_MAX = { wednesday: 3, sunday: 28, prime: 3 }
  const r = e.record
  const fixed = FIXED_MAX[r.getString("type")]
  if (fixed && r.getInt("maxParticipants") !== fixed) {
    throw new BadRequestError(`Esse tipo de evento tem exatamente ${fixed} vagas.`, {
      maxParticipants: new ValidationError("fixed_max", `Deve ser ${fixed}.`),
    })
  }
  if (r.getDateTime("registrationOpensAt").unix() >= r.getDateTime("eventDate").unix()) {
    throw new BadRequestError("A lista deve abrir antes do evento.", {
      registrationOpensAt: new ValidationError("opens_after_event", "Deve ser antes do evento."),
    })
  }
  if (r.getString("cancelledAt") && !r.getString("cancellationReason").trim()) {
    throw new BadRequestError("Informe o motivo do cancelamento.", {
      cancellationReason: new ValidationError("required", "Obrigatório ao cancelar."),
    })
  }
  e.next()
}, "events")
