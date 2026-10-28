/// <reference path="../../pb_data/types.d.ts" />

// Regras de inscrição. Toda função recebe o `txApp` de um runInTransaction: as escritas no
// PocketBase passam por uma conexão única, então transações não se intercalam e a lotação vale
// mesmo com inscrições simultâneas.

const ACTIVE = ["confirmed", "waitlist", "attended"]
const nowUnix = () => Math.floor(Date.now() / 1000)

function findOptional(txApp, collection, filter, params) {
  try {
    return txApp.findFirstRecordByFilter(collection, filter, params)
  } catch (_) {
    return null
  }
}

function loadEvent(txApp, eventId) {
  try {
    return txApp.findRecordById("events", eventId)
  } catch (_) {
    throw new NotFoundError("Evento não encontrado.")
  }
}

function bump(event, field, delta) {
  event.set(field, Math.max(0, event.getInt(field) + delta))
}

/** Inscreve `userId`: confirmado se houver vaga, senão no fim da fila de espera. */
function register(txApp, eventId, userId) {
  const event = loadEvent(txApp, eventId)
  if (event.getString("cancelledAt")) throw new BadRequestError("Esse evento foi cancelado.")
  if (nowUnix() < event.getDateTime("registrationOpensAt").unix()) throw new BadRequestError("A lista ainda não abriu.")
  if (nowUnix() >= event.getDateTime("eventDate").unix()) throw new BadRequestError("O evento já começou.")

  let reg = findOptional(txApp, "registrations", "event = {:e} && user = {:u}", { e: eventId, u: userId })
  if (reg && ACTIVE.includes(reg.getString("status"))) throw new BadRequestError("Você já está na lista.")

  const last = txApp.findRecordsByFilter("registrations", "event = {:e}", "-position", 1, 0, { e: eventId })
  const position = last.length ? last[0].getInt("position") + 1 : 1
  const status = event.getInt("confirmedCount") < event.getInt("maxParticipants") ? "confirmed" : "waitlist"

  if (!reg) {
    reg = new Record(txApp.findCollectionByNameOrId("registrations"))
    reg.set("event", eventId)
    reg.set("user", userId)
  }
  reg.set("status", status)
  reg.set("position", position) // reinscrição volta para o fim
  txApp.save(reg)

  bump(event, status === "confirmed" ? "confirmedCount" : "waitlistCount", 1)
  txApp.save(event)
  return reg
}

/** Cancela a inscrição de `userId` e, se liberou vaga, promove a fila. */
function cancel(txApp, eventId, userId) {
  const event = loadEvent(txApp, eventId)
  if (nowUnix() >= event.getDateTime("eventDate").unix()) throw new BadRequestError("O evento já começou.")

  const reg = findOptional(txApp, "registrations", "event = {:e} && user = {:u}", { e: eventId, u: userId })
  const status = reg ? reg.getString("status") : ""
  if (status !== "confirmed" && status !== "waitlist") throw new BadRequestError("Você não está na lista.")

  reg.set("status", "cancelled")
  txApp.save(reg)
  bump(event, status === "confirmed" ? "confirmedCount" : "waitlistCount", -1)
  promote(txApp, event)
  txApp.save(event)
  return reg
}

/** Confirma os primeiros da fila enquanto houver vaga. Não salva o evento: quem chama salva. */
function promote(txApp, event) {
  const free = event.getInt("maxParticipants") - event.getInt("confirmedCount")
  if (free <= 0) return
  const next = txApp.findRecordsByFilter("registrations", "event = {:e} && status = 'waitlist'", "position", free, 0, { e: event.id })
  for (const reg of next) {
    reg.set("status", "confirmed")
    txApp.save(reg)
    bump(event, "confirmedCount", 1)
    bump(event, "waitlistCount", -1)
  }
}

module.exports = { register, cancel, promote }
