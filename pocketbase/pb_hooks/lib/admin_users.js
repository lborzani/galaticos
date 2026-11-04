/// <reference path="../../pb_data/types.d.ts" />

// Gestão de usuários pelo admin. Funções recebem o txApp de um runInTransaction.

const RANKS = ["regular", "mitico", "lendario"]
const ROLES = ["member", "admin"]

function loadUser(txApp, id) {
  try {
    return txApp.findRecordById("users", id)
  } catch (_) {
    throw new NotFoundError("Usuário não encontrado.")
  }
}

/** Muda rank e/ou papel. O admin não muda o próprio papel (sempre sobra um admin). */
function update(txApp, adminId, userId, body) {
  const user = loadUser(txApp, userId)
  if (body.rank !== undefined) {
    if (!RANKS.includes(body.rank)) throw new BadRequestError("Rank inválido.")
    user.set("rank", body.rank)
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) throw new BadRequestError("Papel inválido.")
    if (userId === adminId) throw new BadRequestError("Você não pode mudar o próprio papel.")
    user.set("role", body.role)
  }
  txApp.saveNoValidate(user) // conta antiga pode não ter telefone
}

/**
 * Bane: desloga na hora (novo tokenKey), tira de inscrições e convites de eventos futuros (o time do
 * capitão se desfaz, a fila anda) e apaga os aparelhos de push. Devolve [{ eventId, promoted }] para avisar.
 */
function ban(txApp, adminId, userId, reason) {
  reason = String(reason || "").trim()
  if (!reason) throw new BadRequestError("Informe o motivo.", { reason: new ValidationError("required", "Obrigatório.") })
  if (reason.length > 300) throw new BadRequestError("Motivo muito longo (máx. 300).")
  if (userId === adminId) throw new BadRequestError("Você não pode banir a si mesmo.")

  const user = loadUser(txApp, userId)
  user.set("bannedAt", new DateTime())
  user.set("banReason", reason)
  user.set("bannedBy", adminId)
  user.refreshTokenKey()
  txApp.saveNoValidate(user)

  const now = new DateTime().string()
  const { cancel } = require(`${__hooks}/lib/registrations.js`)
  const regs = txApp.findRecordsByFilter("registrations",
    "user = {:u} && (status = 'confirmed' || status = 'waitlist') && event.eventDate > {:now} && event.cancelledAt = ''",
    "", 0, 0, { u: userId, now })
  const promoted = regs.map((reg) => ({ eventId: reg.getString("event"), promoted: cancel(txApp, reg.getString("event"), userId).promoted }))

  const invites = txApp.findRecordsByFilter("invites",
    "player = {:u} && (status = 'pending' || status = 'accepted') && event.eventDate > {:now}", "", 0, 0, { u: userId, now })
  for (const invite of invites) {
    invite.set("status", "cancelled")
    txApp.save(invite)
  }

  for (const sub of txApp.findRecordsByFilter("push_subscriptions", "user = {:u}", "", 0, 0, { u: userId })) txApp.delete(sub)
  return promoted
}

function unban(txApp, userId) {
  const user = loadUser(txApp, userId)
  user.set("bannedAt", "")
  user.set("banReason", "")
  user.set("bannedBy", "")
  txApp.saveNoValidate(user)
}

module.exports = { update, ban, unban }
