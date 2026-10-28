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
  if (r.getInt("maxParticipants") < r.getInt("confirmedCount")) {
    throw new BadRequestError(`Já há ${r.getInt("confirmedCount")} confirmados; não dá para ter menos vagas.`, {
      maxParticipants: new ValidationError("below_confirmed", "Menor que o número de confirmados."),
    })
  }
  if (r.getString("cancelledAt") && !r.getString("cancellationReason").trim()) {
    throw new BadRequestError("Informe o motivo do cancelamento.", {
      cancellationReason: new ValidationError("required", "Obrigatório ao cancelar."),
    })
  }
  e.next()
}, "events")

// Ao editar: mais vagas promovem a fila (mesma transação do update); cancelamento avisa os inscritos.
onRecordUpdateRequest((e) => {
  const before = e.record.original()
  const grew = e.record.getInt("maxParticipants") > before.getInt("maxParticipants")
  const cancelling = !!e.record.getString("cancelledAt") && !before.getString("cancelledAt")
  let promotedIds = []

  if (grew) {
    const { promote } = require(`${__hooks}/lib/registrations.js`)
    $app.runInTransaction((txApp) => {
      e.app = txApp
      promotedIds = promote(txApp, e.record)
      e.next()
    })
  } else {
    e.next()
  }

  // push depois de gravar: falha de envio nunca desfaz a edição
  const push = require(`${__hooks}/lib/push.js`)
  if (cancelling) push.eventCancelled($app, e.record)
  push.promoted($app, e.record.id, promotedIds)
}, "events")
