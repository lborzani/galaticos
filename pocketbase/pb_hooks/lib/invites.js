/// <reference path="../../pb_data/types.d.ts" />

// Regras do Prime. Funções recebem o txApp de um runInTransaction.

const ACTIVE_INVITE = "(status = 'pending' || status = 'accepted')"
const CAPTAIN_REG = "(status = 'confirmed' || status = 'attended')"

function exists(txApp, collection, filter, params) {
  return txApp.findRecordsByFilter(collection, filter, "", 1, 0, params).length > 0
}

function openPrimeEvent(txApp, eventId) {
  let event
  try {
    event = txApp.findRecordById("events", eventId)
  } catch (_) {
    throw new NotFoundError("Evento não encontrado.")
  }
  if (!event.getBool("teams")) throw new BadRequestError("Convites são só para eventos com times.")
  if (event.getString("cancelledAt")) throw new BadRequestError("Esse evento foi cancelado.")
  if (Math.floor(Date.now() / 1000) >= event.getDateTime("eventDate").unix()) throw new BadRequestError("O evento já começou.")
  return event
}

const isCaptain = (txApp, eventId, userId) =>
  exists(txApp, "registrations", `event = {:e} && user = {:u} && ${CAPTAIN_REG}`, { e: eventId, u: userId })

function send(txApp, eventId, captainId, playerId) {
  openPrimeEvent(txApp, eventId)
  if (!isCaptain(txApp, eventId, captainId)) throw new ForbiddenError("Só capitães confirmados convidam.")
  if (playerId === captainId) throw new BadRequestError("Você já é o capitão do time.")

  let player
  try {
    player = txApp.findRecordById("users", playerId)
  } catch (_) {
    throw new NotFoundError("Jogador não encontrado.")
  }
  if (!player.getBool("availableForTeam")) throw new BadRequestError(`${player.getString("name")} não está disponível para times.`)
  if (isCaptain(txApp, eventId, playerId)) throw new BadRequestError(`${player.getString("name")} é capitão de outro time.`)
  if (exists(txApp, "invites", `event = {:e} && player = {:p} && ${ACTIVE_INVITE}`, { e: eventId, p: playerId })) {
    throw new BadRequestError(`${player.getString("name")} já tem convite para este evento.`)
  }

  const invite = new Record(txApp.findCollectionByNameOrId("invites"))
  invite.set("event", eventId)
  invite.set("captain", captainId)
  invite.set("player", playerId)
  invite.set("status", "pending")
  txApp.save(invite)
  return invite
}

/** Aceitar/recusar (convidado) ou cancelar (capitão) um convite pendente. */
function respond(txApp, inviteId, userId, action) {
  let invite
  try {
    invite = txApp.findRecordById("invites", inviteId)
  } catch (_) {
    throw new NotFoundError("Convite não encontrado.")
  }
  const actor = action === "cancel" ? "captain" : "player"
  if (invite.getString(actor) !== userId) throw new ForbiddenError("Esse convite não é seu.")
  if (invite.getString("status") !== "pending") throw new BadRequestError("Esse convite não está mais pendente.")
  if (action === "accept") openPrimeEvent(txApp, invite.getString("event"))

  invite.set("status", { accept: "accepted", decline: "declined", cancel: "cancelled" }[action])
  txApp.save(invite)
  return invite
}

/** Capitão saiu da lista: o time se desfaz e os jogadores ficam livres para outros convites. */
function releaseTeam(txApp, eventId, captainId) {
  const invites = txApp.findRecordsByFilter("invites", `event = {:e} && captain = {:c} && ${ACTIVE_INVITE}`, "", 0, 0, { e: eventId, c: captainId })
  for (const invite of invites) {
    invite.set("status", "cancelled")
    txApp.save(invite)
  }
}

module.exports = { send, respond, releaseTeam }
