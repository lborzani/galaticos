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
  if (event.getString("type") === "prime" &&
      findOptional(txApp, "invites", "event = {:e} && player = {:u} && (status = 'pending' || status = 'accepted')", { e: eventId, u: userId })) {
    throw new BadRequestError("Você já foi convidado para um time deste evento.")
  }

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
  ensurePassport(txApp, reg)

  bump(event, status === "confirmed" ? "confirmedCount" : "waitlistCount", 1)
  txApp.save(event)
  return reg
}

/** Cancela a inscrição de `userId` e, se liberou vaga, promove a fila. Devolve quem foi promovido. */
function cancel(txApp, eventId, userId) {
  const event = loadEvent(txApp, eventId)
  if (nowUnix() >= event.getDateTime("eventDate").unix()) throw new BadRequestError("O evento já começou.")

  const reg = findOptional(txApp, "registrations", "event = {:e} && user = {:u}", { e: eventId, u: userId })
  const status = reg ? reg.getString("status") : ""
  if (status !== "confirmed" && status !== "waitlist") throw new BadRequestError("Você não está na lista.")

  reg.set("status", "cancelled")
  txApp.save(reg)
  if (status === "confirmed" && event.getString("type") === "prime") {
    require(`${__hooks}/lib/invites.js`).releaseTeam(txApp, eventId, userId)
  }
  bump(event, status === "confirmed" ? "confirmedCount" : "waitlistCount", -1)
  const promoted = promote(txApp, event)
  txApp.save(event)
  return { registration: reg, promoted }
}

/** Confirma os primeiros da fila enquanto houver vaga e devolve os ids promovidos. Não salva o evento: quem chama salva. */
function promote(txApp, event) {
  const free = event.getInt("maxParticipants") - event.getInt("confirmedCount")
  if (free <= 0) return []
  const next = txApp.findRecordsByFilter("registrations", "event = {:e} && status = 'waitlist'", "position", free, 0, { e: event.id })
  for (const reg of next) {
    reg.set("status", "confirmed")
    txApp.save(reg)
    bump(event, "confirmedCount", 1)
    bump(event, "waitlistCount", -1)
  }
  return next.map((reg) => reg.getString("user"))
}

function ensurePassport(txApp, reg) {
  if (findOptional(txApp, "passports", "registration = {:r}", { r: reg.id })) return
  const p = new Record(txApp.findCollectionByNameOrId("passports"))
  p.set("registration", reg.id)
  p.set("user", reg.getString("user"))
  p.set("token", $security.randomString(40))
  txApp.save(p)
}

/** Resolve o QR lido pelo admin. Recusa token desconhecido, inscrição fora da lista e evento cancelado. */
function checkPassport(txApp, token) {
  const passport = findOptional(txApp, "passports", "token = {:t}", { t: String(token || "") })
  if (!passport) throw new NotFoundError("QR Code inválido.")
  const reg = txApp.findRecordById("registrations", passport.getString("registration"))
  const event = txApp.findRecordById("events", reg.getString("event"))
  const user = txApp.findRecordById("users", reg.getString("user"))
  const status = reg.getString("status")
  if (event.getString("cancelledAt")) throw new BadRequestError("Esse evento foi cancelado.")
  if (status === "cancelled") throw new BadRequestError(`${user.getString("name")} cancelou a inscrição.`)
  if (status === "waitlist") throw new BadRequestError(`${user.getString("name")} está na lista de espera, não confirmado.`)
  return { registration: reg, event, user, alreadyAttended: status === "attended" }
}

function attend(txApp, token, adminId) {
  const r = checkPassport(txApp, token)
  if (r.alreadyAttended) return r
  r.registration.set("status", "attended")
  r.registration.set("attendedAt", new DateTime())
  r.registration.set("attendedBy", adminId)
  txApp.save(r.registration)
  return r
}

module.exports = { register, cancel, promote, checkPassport, attend }
